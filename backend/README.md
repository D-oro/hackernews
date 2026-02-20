# Hacker News Title Generator Backend
TypeScript, Google Cloud Functions Framework

## Getting started
Install dependencies:

```bash
npm install
```

## Run the API locally
```bash
npm run dev
```

now you can reach:
http://localhost:8080


## Run tests
```bash
npm run test
```

## Deploy the API to Google Cloud (Cloud Functions 2nd gen)
you need a gcloud account to authenticate and deploy this project 

```bash
gcloud auth login
```

to build and deploy to gcloud use:
```bash
npm run deploy`
```

Alternatively use:
`npm run build`

and then:

```bash
gcloud functions deploy helloWorld \
  --gen2 \
  --runtime=nodejs22 \
  --region=europe-west2 \
  --entry-point=helloWorld \
  --trigger-http \
  --no-allow-unauthenticated \
  --set-secrets \"GEMINI_API_KEY=projects/testproject-487517/secrets/GEMINI_API_KEY:latest\"
```

Deploying this way restricts access to authenticated users. 

You can temporarily change this by running

```bash
PROJECT_ID="testproject-487517"
REGION="europe-west2"
SERVICE="helloworld"

gcloud run services add-iam-policy-binding "$SERVICE" \
--project="$PROJECT_ID" \
--region="$REGION" \
--member="allUsers" \
--role="roles/run.invoker"
```

and revoke access again with:

```bash
PROJECT_ID="testproject-487517"
REGION="europe-west2"
SERVICE="helloworld"

gcloud run services remove-iam-policy-binding "$SERVICE" \
  --project="$PROJECT_ID" \
  --region="$REGION" \
  --member="allUsers" \
  --role="roles/run.invoker"
```


