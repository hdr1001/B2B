# B2B
Repo containing the code I developed as it relates to B2B API's, UI's, data processing, etc.

## Content
1. [Introduction](#introduction)
2. [GitHub repo](#github-repo)
3. [1st Node.js script](#first-nodejs-script)

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

[def00001]: https://onedrive.live.com/embed?resid=737B6DCF4DE57D80%2110659&authkey=%21ANInHYJzHrgtSIY&width=999999&height=660
[def00002]: https://onedrive.live.com/embed?resid=737B6DCF4DE57D80%2110658&authkey=%21AOiUWHnoJaWzcLc&width=999999&height=448
[def00003]: https://onedrive.live.com/embed?resid=737B6DCF4DE57D80%2110660&authkey=%21ABbXt4yOUaQh_eA&width=384&height=999999
[def00004]: https://onedrive.live.com/embed?resid=737B6DCF4DE57D80%2110661&authkey=%21AHeCK8qa_gSNjQg&width=620&height=999999
[def00005]: https://onedrive.live.com/embed?resid=737B6DCF4DE57D80%2110688&authkey=%21AM-ECf-UaGF4KaA&width=660
[def00006]: https://onedrive.live.com/embed?resid=737B6DCF4DE57D80%2110691&authkey=%21AJA-z08rLyNIi9o&width=660
[def00007]: https://onedrive.live.com/embed?resid=737B6DCF4DE57D80%2110692&authkey=%21ALlSZUvkVr-cye8&width=660
