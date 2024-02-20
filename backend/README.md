## Getting the Docker Compose application up-n-running
### Step 1: Clone the GitHub repo
```~/Documents/dev$ gh repo clone hdr1001/B2B```

### Step 2: Enter the project's node directory
```cd B2B/backend/node```

### Step 3: Create & edit the .env.docker file
```cp dotEnv .env.docker```

```vim .env.docker```

*example contents*

PG_HOST="b2b_ah_pg"

PG_DATABASE="postgres"

PG_USER="postgres"

API_SERVER_PORT=8080

### Step 4: Create secrets
```mkdir ~/.secrets```

```echo "123InsKeyHere789" > ~/.secrets/dnb_dpl_key```

```echo "123InsSecretHere789" > ~/.secrets/dnb_dpl_secret```

```echo "123InsPgPwdHere789" > ~/.secrets/pg_password```

### Step 5: Build & run the Docker Compose application
```cd ..```

```docker-compose --env-file node/.env.docker build```

```docker-compose --env-file node/.env.docker up -d```

```docker-compose --env-file node/.env.docker logs```

To stop the application:

```docker-compose --env-file node/.env.docker down```

