i just push the newest windows version in our github repo, you can install the runable ver if you didn't install all the dependencies, and the command is :
conda activate "C:\Users\1\conda_envs\prophet_env"
$env:PYTHONNOUSERSITE=1
cd F:\deco\A2\2025-fire\python-backend
python -m uvicorn main:app --reload --host 0.0.0.0 --port 8000 
  
and open a other terminal:
get in the file of our front-end/team-project
and run 
  cd .\front-end\team-project\
  npm start
