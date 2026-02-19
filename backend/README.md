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


## Deploy the API to Google Cloud (Cloud Functions 2nd gen)
Only authenticated users can deploy, and right now that is restricted to doro.codes@gmail.com

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
