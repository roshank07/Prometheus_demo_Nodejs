import express from 'express';
import doSomeHeavyTask from './utils.js';
import prom from 'prom-client';
import responseTime from 'response-time';
import { createLogger, transports } from 'winston'
import LokiTransport from 'winston-loki';
const options = {
  transports: [
    new LokiTransport({
      labels: {
        appName: "express"

      },
      host: "http://127.0.0.1:3100"
    })
  ]
};
const logger = createLogger(options);

const PORT=4000;
const app=express();
const collectDefaultmetrics=prom.collectDefaultMetrics;

collectDefaultmetrics({register: prom.register});

const resResTime=new prom.Histogram({
    name: "http_express_req_res_time",
    help: "This tells you time taken by api req and res",
    labelNames: ["method","route","status_code"],
    buckets: [1,50,100,200,400,600,800,1000,2000]
});

const totalReqCounter=new prom.Counter({
    name: "total_req",
    help: "Tells about total request"

})

app.use(responseTime((req,res,time)=>{
    totalReqCounter.inc();
    resResTime
    .labels({
        method: req.method,
        route: req.url,
        status_code: res.statusCode
    })
    .observe(time);
}))

app.get("/",(req,res)=>{
    logger.info('Route is on / router');
    res.json('Server is running fast.');
})

app.get("/slow",async(req,res)=>{
   try {
    logger.info('Route is on /slow router');
    const timeTaken=await doSomeHeavyTask();
    return res.status(200).json({status:"Success",message:`Task Completed in ${timeTaken} ms`});
    
   } catch (error) {
    logger.error(error.message);

    return res.status(500).json({status:"Error",error:"Internal Server Error"})
    
   }
})

app.get("/metrics",async(req,res)=>{
    res.setHeader('Content-Type',prom.register.contentType);
    const metrics=await prom.register.metrics();
    res.send(metrics);

})

app.listen(PORT,()=>{
    console.log(`Server is running on ${PORT}`);
})
