
/**
 * Created by rtholmes on 2016-09-03.
 */

import DatasetController from "../src/controller/DatasetController";
import Log from "../src/Util";

import JSZip = require('jszip');
import {expect} from 'chai';
import InsightFacade from "../src/controller/InsightFacade";
import {InsightResponse} from "../src/controller/InsightFacade";


describe("CoursesDatasetController", function () {

    let facade: InsightFacade;
    var course1: any;
    var course2: any;
    var zip: JSZip;
    var data: any;
    before(function () {
        facade = new InsightFacade();
        zip = new JSZip;
        course1 = {
            "result": [
                {
                    "tier_eighty_five": 6,
                    "tier_ninety": 5,
                    "Title": "japn fdl to mod"
                },
                {
                    "tier_eighty_five": 8,
                    "tier_ninety": 5,
                    "Title": "japn fdl to mod"
                }
            ]
        };
        course2 = {
            "result": [
                {
                    "tier_eighty_five": 2,
                    "tier_ninety": 1,
                    "Title": "rise korean civl"
                },
                {
                    "tier_eighty_five": 2,
                    "tier_ninety": 1,
                    "Title": "rise korean civl"
                }
            ]
        };
        zip.folder('courses')
            .file('ASIA315', JSON.stringify(course1))
            .file('ASIA317', JSON.stringify(course2));
        const opts = {compression: 'deflate', compressionOptions: {level: 2}, type: 'base64'};
        data = zip.generateAsync(opts);

    });

    after(function () {
        facade.removeDataset('courses');
        facade.removeDataset('badJSON');
    });

    afterEach(function () {
    });

    it("Should be able to add valid new Dataset", function () {

        return facade.addDataset('courses', data)
            .then(function (result: InsightResponse) {
                Log.test('Response: ' + JSON.stringify(result));
                expect(result.code).to.equal(204);
            })
    });


    it("Should be able to add valid Dataset with existing ID", function () {        // PROBLEM!

        return facade.addDataset('courses', data)
            .then(function () {
                return facade.addDataset('courses', data)
            }).then(function (result: InsightResponse) {
                Log.test('Response: ' + JSON.stringify(result));
                expect(result.code).to.equal(201);
            });
    });

    it("Should not add invalid zip data", function () {

        return facade.addDataset('courses', "this is invalid")
            .then(function (result: InsightResponse) {
                expect.fail('Should not happen');
            }).catch (function (rejResult: InsightResponse) {
                Log.test('Response: ' + JSON.stringify(rejResult));
                expect(rejResult.code).to.equal(400);
            });

    });

    it("Should reject zip with invalid JSON ", function () {        // JSON invalid or dataset structure invalid?

        return facade.addDataset('courses', 'UEsDBAoAAAAIAAEiJEm/nBg/EQAAAA8AAAALAAAAY29udGVudC5vYmqrVspOrVSyUipLzClNVaoFAFBLAQIUAAoAAAAIAAEiJEm/nBg/EQAAAA8AAAALAAAAAAAAAAAAAAAAAAAAAABjb250ZW50Lm9ialBLBQYAAAAAAQABADkAAAA6AAAAAAA=')
            .then(function (result: InsightResponse) {
                expect.fail('Should not happen');
            }).catch(function (rejResult) {
                Log.test('Response: ' + JSON.stringify(rejResult));
                expect(rejResult.code).to.equal(400);
            });
    });

    it ("Bender: Should not be able to set a valid zip that does not contain any real data", function () {
        course1 = {
            "result": []
        }
        course2 = {
            "result": [],
            "rank": 0
        }
        zip.folder('courses')
            .file('ASIA315', JSON.stringify(course1))
            .file('ASIA317', JSON.stringify(course2));
        const opts = {compression: 'deflate', compressionOptions: {level: 2}, type: 'base64'};
        var emptyData:any = zip.generateAsync(opts);

        return facade.addDataset('courses', emptyData)
            .then(function () {
                expect.fail();
            }).catch(function (result: InsightResponse) {
                expect(result.code).to.equal(400);
                expect(result.body).to.eql({error: 'Zip contains no valid data'});
            })
    });

    it("Should be able to delete existing Dataset", function () {

        return facade.addDataset('courses', data)
            .then(function (result) {
                Log.test('Dataset processed; result: ' + JSON.stringify(result));
                return facade.removeDataset('courses');
            })
            .then(function (delResult: InsightResponse) {
                Log.test('Dataset deleted; result: ' + JSON.stringify(delResult));
                expect(delResult.code).to.equal(204);
            });
    });

    it("Should return 404 code if dataset to delete does not exist in memory", function () {

        return facade.addDataset('courses', data)
            .then(function (result: InsightResponse) {
                return facade.dataController.deleteDatasetInMemory('courses');
            }).then(function () {
                return facade.removeDataset('courses');
            }).then(function (rmvResponse: InsightResponse) {
                expect.fail();         // if it gets here, test should fail
            })
            .catch(function (thrownObj: InsightResponse) {      // reject should get caught here
                expect(thrownObj.code).to.equal(404);
                Log.test('Response: ' + JSON.stringify(thrownObj));
            });
    });

    it("Should return 404 code if dataset to delete does not exist on disk", function () {

        return facade.addDataset('courses', data)
            .then(function (result: InsightResponse) {
                //expect(result.code).to.equal(204);
                return facade.dataController.deleteDatasetOnDisk('courses');
            }).then(function () {
                return facade.removeDataset('courses');
            }).then(function (rmvResponse: InsightResponse) {
                expect.fail();
            })
            .catch(function (rejResponse: InsightResponse) {          // reject should get caught here
                expect(rejResponse.code).to.equal(404);
                Log.test('Response: ' + JSON.stringify(rejResponse));
            });
    });



})
;

//
//     it("Should save processed dataset into memory and onto disk", function () {
//         let controller = new DatasetController;
//         var processedDataset: {[name: string]: any} = {};
//         processedDataset['ANTH103'] = {
//             "tier_eighty_five": 23,
//             "tier_ninety": 23
//         };
//         processedDataset['ARTH480'] = {
//             "tier_eighty_five": 11,
//             "tier_ninety": 11
//         };
//
//         controller.save('twoCourses', processedDataset);
//         expect(controller.returnData('twoCourses')).to.eql(
//             {
//                 "ANTH103": "{\"tier_eighty_five\":23,\"tier_ninety\":23}",
//                 "ARTH480": "{\"tier_eighty_five\":11,\"tier_ninety\":11}"
//             });
//
//         Log.trace(JSON.stringify(JSON.parse(JSON.stringify({
//             "ANTH103": "{\"tier_eighty_five\":23,\"tier_ninety\":23}",
//             "ARTH480": "{\"tier_eighty_five\":11,\"tier_ninety\":11}"
//         }))));
//     });
//
//
//     it("Should be able to load data from memory", function () {
//         let controller = new DatasetController();
//         //controller.getDataset('nonexistantDataset');
//         //expect(controller.returnData('nonexistantDataset')).to.be.undefined;
//         controller.getDataset('sample');
//         expect(controller.returnData('sample')).to.not.be.undefined;
//
//
//         //expect(toReturn).to.equal('a');
//     });
//
//     it("Should load all dataset files in ./data from disk if dataset is empty", function () {
//         let controller = new DatasetController();
//         controller.getDatasets();
//         Log.trace(JSON.stringify(controller.returnData('sample.json')));
//
//         expect(controller.returnData('sample.json')).to.not.be.undefined;
//         expect(controller.returnData('setA.json')).to.not.be.undefined;
//         expect(controller.returnData('tiers.json')).to.not.be.undefined;
//         expect(controller.returnData('twoCourses.json')).to.not.be.undefined;
//         expect(controller.returnData('courses.json')).to.be.undefined;
//
//     });
//
// })
// ;
