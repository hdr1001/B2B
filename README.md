# B2B
Repo containing the code I developed as it relates to B2B API's, UI's, data processing, etc.

## Content
1. [Introduction](#introduction)
2. [GitHub repo](#github-repo)
3. [1st Node.js script](#first-nodejs-script)
4. [Testing fetch to consume GLEIF data](#testing-fetch-to-consume-gleif-data)
5. [Added rate limiter](#added-rate-limiter)
6. [Fetch a D&B Direct+ token](#using-fetch-to-retrieve-a-db-direct-token)
7. [D&B Direct+ data blocks](#project-now-supports-db-data-blocks)

## Introduction
In this repository I want to bring together all the B2B (D&B, GLEIF, ...) code I have developed over time and expand from there. Initially the most important sources will be the following GitHub repositories: [API Hub - Request, Persist & Respond (v4)](https://github.com/hdr1001/api_hub_rpr_v4) and [D&B Direct+ utilities (v3)](https://github.com/hdr1001/dnbDplUtilities_v3).

## GitHub repo
I created the GitHub [B2B repo](https://github.com/hdr1001/B2B) in my browser:

![Online creation of GitHub repository][def00001]

Next, using Visual Studio Code (VSC) functionality, I cloned the repository to my PC:

![Clone the GitHub repo][def00002]

## First Node.js script
Initialized the folder structure of the backend part of the project and the Node Package Manager:

![npm init][def00003]

Executed minimal Node.js script:

![npm run][def00004]

## Testing fetch to consume GLEIF data
Implemented three different GLEIF API requests using fetch (separated [definitions](https://bit.ly/47sHzLb) from the [implementation](https://bit.ly/3Yt3E8q)):

![fetch GLEIF][def00005]

## Added rate limiter
Always use John Hurliman's [rate limiter](https://github.com/jhurliman/node-rate-limiter) but please note the pinned version!

![rate limiter][def00006]

With the rate limiter in place it is possible to launch multiple requests while, at the same time, respecting the TPS limit set by GLEIF.

![multiple requests][def00007]

## Using fetch to retrieve a D&B Direct+ token

Moving on with code to retrieve a D&B Direct+ [token](https://directplus.documentation.dnb.com/openAPI.html?apiID=authentication) using fetch. Had to install module [dotenv](https://www.npmjs.com/package/dotenv?ref=hackernoon.com) to savely store the API credentials.

![Fetch D+ token][def00008]

## Project now supports D&B data blocks
Added a new [definition and class](https://bit.ly/3QyfhsV) to support D&B Direct+ data blocks. Also added [test code](https://bit.ly/3DSoZ1t) to the project as well. Shortest way to run the code is in GitHub Codespaces.

![GitHub Codespaces][def00009]

After creating the needed [environment variables](https://github.com/hdr1001/B2B/blob/0dbe961ae68b10fc2d3a4632e3c59a40a472b282/backend/node/dotEnv) as [secrets](https://docs.github.com/en/codespaces/managing-your-codespaces/managing-encrypted-secrets-for-your-codespaces) running the code is basically a three step process.

![npm run fetch][def00010]

[def00001]: https://onedrive.live.com/embed?resid=737B6DCF4DE57D80%2110659&authkey=%21ANInHYJzHrgtSIY&width=999999&height=660
[def00002]: https://onedrive.live.com/embed?resid=737B6DCF4DE57D80%2110658&authkey=%21AOiUWHnoJaWzcLc&width=999999&height=448
[def00003]: https://onedrive.live.com/embed?resid=737B6DCF4DE57D80%2110660&authkey=%21ABbXt4yOUaQh_eA&width=384&height=999999
[def00004]: https://onedrive.live.com/embed?resid=737B6DCF4DE57D80%2110661&authkey=%21AHeCK8qa_gSNjQg&width=620&height=999999
[def00005]: https://onedrive.live.com/embed?resid=737B6DCF4DE57D80%2110688&authkey=%21AM-ECf-UaGF4KaA&width=660
[def00006]: https://onedrive.live.com/embed?resid=737B6DCF4DE57D80%2110691&authkey=%21AJA-z08rLyNIi9o&width=660
[def00007]: https://onedrive.live.com/embed?resid=737B6DCF4DE57D80%2110692&authkey=%21ALlSZUvkVr-cye8&width=660
[def00008]: https://onedrive.live.com/embed?resid=737B6DCF4DE57D80%2110714&authkey=%21ADFrizxoQpFV-9U&width=660
[def00009]: https://onedrive.live.com/embed?resid=737B6DCF4DE57D80%2110721&authkey=%21AJxu4j37hZQe3tQ&width=660
[def00010]: https://am4pap001files.storage.live.com/y4mR1Ci_6jc9-wl3GxREg3tFX6DmFYLez9qTpZYdmZlMTOJksjBouozRdWV6v6ib8erKpdgvnEqAk9fhTPioEGQSgblLOi0Q9Y4iyI9Wsa4Bmwok9Gh7c8gyC5133l7sFtjXd9ETDcoVg1tqeiNg3i2PHB31nTDAlHY__M43YIIB4c0cAueCPKyGD0lfmfvyoGf?width=660&height=478&cropmode=none
