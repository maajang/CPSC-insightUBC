/**
 * Created by Kirsten on 2016-10-27.
 */

import DatasetController from "../src/controller/DatasetController";
import Log from "../src/Util";

import JSZip = require('jszip');
import {expect} from 'chai';
import InsightFacade from "../src/controller/InsightFacade";
import {InsightResponse} from "../src/controller/InsightFacade";
var http = require("http");


describe("RoomsDatasetController", function () {

    let facade: InsightFacade;
    var zip: JSZip;
    var data: any;

    before(function () {
        facade = new InsightFacade();
        zip = new JSZip;
        zip.file('index.htm', '<!DOCTYPE html><html><body>Building Index</body></html>')
            .folder('campus')
            .folder('discover')
            .folder('buildings-and-classrooms')
            .file('ANSO', '<!DOCTYPE html><html><body>ANSO Building</body></html>')
            .file('BIOL', '<!DOCTYPE html><html><body>BIOL Building</body></html>')
            .file('BUCH', '<!DOCTYPE html><html><body>BUCH Building</body></html>');
        const opts = {compression: 'deflate', compressionOptions: {level: 2}, type: 'base64'};
        data = zip.generateAsync(opts);

    });

    after(function () {
        facade.removeDataset('rooms');
    });

    afterEach(function () {
    });

    it("Should be able to add valid new Dataset", function () {

        return facade.addDataset('rooms', data)
            .then(function (result: InsightResponse) {
                Log.test('Response: ' + JSON.stringify(result));
                expect(result.code).to.equal(204);
            })
    });


    it("Should be able to add valid Dataset with existing ID", function () {        // PROBLEM!

        return facade.addDataset('rooms', data)
            .then(function () {
                return facade.addDataset('rooms', data)
            }).then(function (result: InsightResponse) {
                Log.test('Response: ' + JSON.stringify(result));
                expect(result.code).to.equal(201);
            });
    });

    it("Should not add invalid zip roomData", function () {

        return facade.addDataset('rooms', "this is invalid")
            .then(function (result: InsightResponse) {
                expect.fail('Should not happen');
            }).catch (function (rejResult: InsightResponse) {
                Log.test('Response: ' + JSON.stringify(rejResult));
                expect(rejResult.code).to.equal(400);
            });

    });



    it("Should reject zip with invalid structure ", function () {        // JSON invalid or dataset structure invalid?

        return facade.addDataset('rooms', 'UEsDBAoAAAAIAAEiJEm/nBg/EQAAAA8AAAALAAAAY29udGVudC5vYmqrVspOrVSyUipLzClNVaoFAFBLAQIUAAoAAAAIAAEiJEm/nBg/EQAAAA8AAAALAAAAAAAAAAAAAAAAAAAAAABjb250ZW50Lm9ialBLBQYAAAAAAQABADkAAAA6AAAAAAA=')
            .then(function (result: InsightResponse) {
                expect.fail('Should not happen');
            }).catch(function (rejResult) {
                Log.test('Response: ' + JSON.stringify(rejResult));
                expect(rejResult.code).to.equal(400);
            });
    });

    it("Should reject zip with invalid HTML ", function () {        // TODO
        zip.folder('310rooms.1.1')
            .file('index.htm', '<!DOCTYPE html><html><body>Building Index</body></html>')
            .folder('campus')
            .folder('discover')
            .folder('buildings-and-classrooms')
            .file('ANSO', '<!html><html><body>ANSO Building</body></html>')
            .file('BIOL', '<!DOCTYPE html><html><body>BIOL Building</body></html>')
            .file('BUCH', '<!DOCTYPE html><html><body>BUCH Building</body></html>');
        const opts = {compression: 'deflate', compressionOptions: {level: 2}, type: 'base64'};
        data = zip.generateAsync(opts);

        return facade.addDataset('rooms', data)
            .then(function (result: InsightResponse) {
                expect.fail('Should not happen');
            }).catch(function (rejResult) {
                Log.test('Response: ' + JSON.stringify(rejResult));
                expect(rejResult.code).to.equal(400);
            });
    });

    // it ("Bender: Should not be able to set a valid zip that does not contain any real data", function () {
    //     course1 = {
    //         "result": []
    //     }
    //     course2 = {
    //         "result": [],
    //         "rank": 0
    //     }
    //     zip.folder('rooms')
    //         .file('ASIA315', JSON.stringify(course1))
    //         .file('ASIA317', JSON.stringify(course2));
    //     const opts = {compression: 'deflate', compressionOptions: {level: 2}, type: 'base64'};
    //     var emptyData:any = zip.generateAsync(opts);
    //
    //     return facade.addDataset('rooms', emptyData)
    //         .then(function () {
    //             expect.fail();
    //         }).catch(function (result: InsightResponse) {
    //             expect(result.code).to.equal(400);
    //             expect(result.body).to.eql({error: 'Zip contains no valid data'});
    //         })

    it("It should be able to return the latlon in the http" , function(){
       var response =  http.get("http://skaha.cs.ubc.ca:8022/api/v1/team49/6245%20Agronomy%20Road%20V6T%201Z4", function(res: any) {
            var b = '';
            console.log("Got response: " + res.statusCode);

            res.on("data", function(chunk: any) {
                console.log("BODY: " + chunk);
            });
             res.on('end', function() {  // to end it
                console.log(b);
            });

        }).on('error', function(e: any) {
            console.log("Got error: " , 404);

        });
        console.log("here")
        console.log(response);



    });
    });
