Run lighthouse benchmarks on URLs anywhere, then store audits on elasticsearch, end analyze results on kibana.

## The idea

This project allow you to run lighthouse analyze on several URLs (on different web sites), using a chrome-less browser.
Audits data is stored in elasticsearch, then can be data-viz'ed with kibana.

### use-case

* benchmark your web site against competitors, run during 1 hour to have multiple samples
* run during 1 day to see any anomaly (regression, down time...) on your web site
* run all the time to see any anomaly on your web site

![](./screenshot_dashboard.png)

## tech stack

* elasticsearch : storage
* kibana        : data-viz
* nodejs        : runtime
* lighthouse    : bench framework
* docker-compose: infra

https://github.com/GoogleChrome/lighthouse/blob/HEAD/docs/readme.md#using-programmatically

## The project

1) Run ES/kibana

```
docker-compose up -d
```

open http://localhost:5601/ 

2) Configure ``index.js`` URLs

3) Run bench script

(this will run in the infinite loop)

```
npm install
node index.js
```