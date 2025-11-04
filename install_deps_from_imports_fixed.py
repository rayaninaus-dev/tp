# install_deps_from_imports_fixed.py
import ast, glob, os, subprocess, sys, importlib.util, shlex

root = os.path.abspath(".")
pyfiles = glob.glob(os.path.join(root, "**", "*.py"), recursive=True)
imports = set()

for p in pyfiles:
    try:
        src = open(p, "r", encoding="utf-8").read()
        tree = ast.parse(src)
        for node in ast.walk(tree):
            if isinstance(node, ast.Import):
                for n in node.names:
                    imports.add(n.name.split('.')[0])
            elif isinstance(node, ast.ImportFrom):
                if node.module:
                    imports.add(node.module.split('.')[0])
    except Exception:
        pass

# filter stdlib (best-effort)
pkgs = []
for m in sorted(imports):
    try:
        spec = importlib.util.find_spec(m)
        if spec is None or ("site-packages" in (spec.origin or "") or "dist-packages" in (spec.origin or "")):
            pkgs.append(m)
    except Exception:
        pkgs.append(m)

print("Detected packages to try install:", pkgs)

conda_exe = os.environ.get("CONDA_EXE")  # best path to conda
use_conda = conda_exe is not None

installed = []
failed = []

for pkg in pkgs:
    print("\n===> Installing:", pkg)
    success = False
    if use_conda:
        cmd = [conda_exe, "install", "-y", "-c", "conda-forge", pkg]
        print("Trying (CONDA_EXE):", " ".join(shlex.quote(x) for x in cmd))
        rc = subprocess.call(cmd)
        if rc == 0:
            success = True
    else:
        try:
            cmd = f"conda install -y -c conda-forge {pkg}"
            print("Trying (shell):", cmd)
            rc = subprocess.call(cmd, shell=True)
            if rc == 0:
                success = True
        except Exception:
            rc = 1

    if not success:
        print("conda failed or unavailable for", pkg, "- trying pip")
        rc = subprocess.call([sys.executable, "-m", "pip", "install", pkg])
        if rc == 0:
            success = True

    if success:
        installed.append(pkg)
    else:
        failed.append(pkg)

with open("requirements_auto.txt", "w", encoding="utf-8") as f:
    for p in installed:
        f.write(p + "\n")
    if failed:
        f.write("\n# FAILED_TO_INSTALL\n")
        for p in failed:
            f.write("# " + p + "\n")

print("\nDone. Installed:", installed)
if failed:
    print("Failed to install (need manual):", failed)
    sys.exit(2)
