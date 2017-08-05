import {ASTNode} from "parse5";
import Log from "../Util";
import ParserHelper from "./ParserHelper";
/**
 * Created by Kirsten on 2016-10-27.
 */


export default class HTMLParser {

    private queriedDataset: {};

    constructor(data: {}) {
        this.queriedDataset = data;
    }


    public static getCoords(address: string): Promise<Object> {
        let that = this;

        return new Promise(function (fulfill, reject) {

            var urlEncoding: string = encodeURI(address);
            var optionsObject = {
                host: 'skaha.cs.ubc.ca',
                port: 8022,
                path: '/api/v1/team48/' + urlEncoding
            };

            var http = require('http');

            http.get(optionsObject, function (res: any) {
                var b = '';
                res.on('data', function (d: any) {
                    b += d;
                });
                res.on('end', function () {
                        var result = JSON.parse(b);
                        fulfill(result);
                });
            }).on('error', function (e: any) {
                reject('getCoords error: ' + JSON.stringify(e));
            });
        });

        //return this.sendRequest(optionsObject, key);
    }


}