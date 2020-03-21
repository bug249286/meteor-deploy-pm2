npm install -g /Users/xxx/xxx/xxx/meteor-deploy

- create ./deploy  root app 
- cd ./deploy && meteor-deploy init
- change 
  - information meteor-deploy.json
  - information settings.json

- meteor-deploy deploy 

- support command
  - deploy
  - backup
  - rollback
  - save
  - stop
  - delete
  - scale // example : meteor-deploy scale  --num 5

  **For base on sub url**
  - example: https://www.domain.com/myapp
  - folder myapp is app meteor
  - set prefixURL = myapp
  - ROOT_URL = https://www.domain.com/myapp
  - prefixURL set to  settings public
