/**
 * Created by rtholmes on 2016-06-14.
 */
import restify = require('restify');
import fs = require('fs');

import DatasetController from '../controller/DatasetController';
import {Datasets} from '../controller/DatasetController';
import QueryController from '../controller/QueryController';

import {QueryRequest} from "../controller/QueryController";
import Log from '../Util';
import InsightFacade from "../controller/InsightFacade";
import {InsightResponse} from "../controller/InsightFacade";

export default class RouteHandler {

    private static RHfacade = new InsightFacade();                    // added

    public static getHomepage(req: restify.Request, res: restify.Response, next: restify.Next) {
        Log.trace('RoutHandler::getHomepage(..)');
        fs.readFile('./src/rest/views/index.html', 'utf8', function (err: Error, file: Buffer) {
            if (err) {
                res.send(500);
                Log.error(JSON.stringify(err));
                return next();
            }
            res.write(file);
            res.end();
            return next();
        });
    }

    public static  putDataset(req: restify.Request, res: restify.Response, next: restify.Next) {
        Log.trace('RouteHandler::putDataset(..) - params: ' + JSON.stringify(req.params));
        let facade = RouteHandler.RHfacade;
        try {
            var id: string = req.params.id;

            // stream bytes from request into buffer and convert to base64
            // adapted from: https://github.com/restify/node-restify/issues/880#issuecomment-133485821
            let buffer: any = [];
            req.on('data', function onRequestData(chunk: any) {
                Log.trace('RouteHandler::postDataset(..) on data; chunk length: ' + chunk.length);
                buffer.push(chunk);
            });

            let that = this;
            req.once('end', function () {
                let concated = Buffer.concat(buffer);
                req.body = concated.toString('base64');
                Log.trace('RouteHandler::postDataset(..) on end; total length: ' + req.body.length);

                return facade.addDataset(id, req.body).then(function (fulfillResponse: InsightResponse) {
                    res.json(fulfillResponse.code, fulfillResponse.body);
                }).catch(function (rejectResponse: InsightResponse) {
                    res.json(rejectResponse.code, rejectResponse.body);
                })
            });
        }

        catch (err) {
            Log.error('RouteHandler::postDataset(..) - ERROR: ' + err.message);
            //res.json(400, {err: err.message});
        }
        return next();
    }

    public static postQuery(req: restify.Request, res: restify.Response, next: restify.Next) {
        Log.trace('RouteHandler::postQuery(..) - params: ' + JSON.stringify(req.params));
        let facade = RouteHandler.RHfacade;

        let query: QueryRequest = req.params;
        Log.trace('RouteHandler::postQuery - about to perform Query');
        return facade.performQuery(query).then(function (response: InsightResponse) {
            Log.trace('RouteHandler::postQuery - about to return query result');
            res.json(response.code, response.body);
        }).catch(function (rejResponse: InsightResponse) {
            Log.error('RouteHandler::postQuery(..) - ERROR' + JSON.stringify(rejResponse.body));
            res.json(rejResponse.code, rejResponse.body);
        }).then(function () {
            return next();
        });
    }

    public static deleteDataset(req: restify.Request, res: restify.Response, next: restify.Next) {
        Log.trace('RouteHandler::deleteDataset(..) - params: ' + JSON.stringify(req.params));
        let facade = RouteHandler.RHfacade;
        try {
            var id: string = req.params.id;
            return facade.removeDataset(id).then(function (fulfillResponse: InsightResponse) {
                res.json(fulfillResponse.code, fulfillResponse.body);
            }).catch(function (rejectResponse: InsightResponse) {
                res.json(rejectResponse.code, rejectResponse.body);
            });
        }
        catch (err) {
            Log.error('RouteHandler::deleteDataset(..) - ERROR: ' + err);
            //res.send(404);
        }
    }
}
