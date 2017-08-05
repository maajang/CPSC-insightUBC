/*
 * This should be in the same folder as your controllers
 */
import {QueryRequest, default as QueryController} from "./QueryController";
import DatasetController from "./DatasetController";
import Log from "../Util";
import {Datasets} from "./DatasetController";

export interface InsightResponse {
    code: number;
    body: {}; // this is what you would return to a requestee in the REST body
}

export interface IInsightFacade {

    /**
     * Add a dataset to UBCInsight.
     *
     * @param id  The id of the dataset being added. This is the same as the PUT id.
     * @param content  The base64 content of the dataset. This is the same as the PUT body.
     *
     * The promise should return an InsightResponse for both fulfill and reject.
     * fulfill should be for 2XX codes and reject for everything else.
     */
    addDataset(id: string, content: string): Promise<InsightResponse>

    /**
     * Remove a dataset from UBCInsight.
     *
     * @param id  The id of the dataset to remove. This is the same as the DELETE id.
     *
     * The promise should return an InsightResponse for both fulfill and reject.
     * fulfill should be for 2XX codes and reject for everything else.
     */
    removeDataset(id: string): Promise<InsightResponse>;

    /**
     * Perform a query on UBCInsight.
     *
     * @param query  The query to be performed. This is the same as the body of the POST message.
     * @return Promise <InsightResponse>
     * The promise should return an InsightResponse for both fulfill and reject.
     * fulfill should be for 2XX codes and reject for everything else./
     */
    performQuery(query: QueryRequest): Promise<InsightResponse>;
}

export default class InsightFacade {

    public dataController: DatasetController;
    public queryController: QueryController;

    /*    constructor() {
     this.dataController = new DatasetController();
     this.dataController.getDatasets().then(function (result: Datasets) {
     this.queryController = new QueryController(result);
     }).catch(function (err) {
     Log.trace('InsightFacade constructor ERROR: ' + JSON.stringify(err));
     });
     }*/

    constructor() {
        this.dataController = new DatasetController();
        this.queryController = new QueryController(this.dataController.getDatasets());
    }

    public addDataset(id: string, content: string): Promise<InsightResponse> {
        var insightToReturn: InsightResponse = {
            code: 0,
            body: {}
        };
        let that = this;
        return new Promise(function (fulfill, reject) {

            that.dataController.process(id, content).then(function (result: number|string) {

                Log.trace('process returned number: ' + result);

                if (result == 1) {
                    insightToReturn.code = 204;
                    insightToReturn.body = {};
                    return fulfill(insightToReturn);
                }
                else if (result == 0) {
                    insightToReturn.code = 201;
                    insightToReturn.body = {};
                    return fulfill(insightToReturn);
                }
                else {
                    insightToReturn.code = 400;
                    insightToReturn.body = {error: result};
                    return reject(insightToReturn);
                }

            }).catch(function (err: string) {
                insightToReturn.code = 400;
                insightToReturn.body = {error: err};
                return reject(insightToReturn);
            });
        })

    }


    public removeDataset(id: string): Promise<InsightResponse> {
        var insightToReturn: InsightResponse = {
            code: 0,
            body: {}
        };
        let that = this;
        return new Promise(function (fulfill, reject) {
            if (that.dataController.deleteDatasetInMemory(id) && that.dataController.deleteDatasetOnDisk(id)) {
                Log.trace('InsightFacade::removeDataset - successful removal');
                insightToReturn.code = 204;
                return fulfill(insightToReturn);
            }
            else {
                Log.trace('InsightFacade::removeDataset - unsuccessful removal');
                insightToReturn.code = 404;
                return reject(insightToReturn);
            }
        });
    }


    /**
     * Perform a query on UBCInsight.
     *
     * @param query  The query to be performed. This is the same as the body of the POST message.
     * @return Promise <InsightResponse>
     * The promise should return an InsightResponse for both fulfill and reject.
     * fulfill should be for 2XX codes and reject for everything else.
     */
    public performQuery(query: QueryRequest): Promise<InsightResponse> {

        let that = this;
        return new Promise(function (fulfill, reject) {

            Log.trace('performQuery query: ' + JSON.stringify(query));
            try {
                var insightToReturn: InsightResponse = {
                    code: 0,
                    body: {}
                };

                var missingDatasets: string[] = [];
                if (query != null && query.GET != null && query.WHERE != null) {
                    missingDatasets = that.checkMissingDatasets(query);
                    if (missingDatasets.length != 0) {
                        insightToReturn.body = {missing: missingDatasets};
                        insightToReturn.code = 424;
                        return reject(insightToReturn);
                    }
                }

                if (!that.queryController.isValid(query)) {
                    insightToReturn.body = {error: 'Invalid query'};
                    insightToReturn.code = 400;
                    return reject(insightToReturn);
                }
                else {
                    insightToReturn.body = that.queryController.query(query);
                    insightToReturn.code = 200;
                    return fulfill(insightToReturn);
                }
            }
            catch (e) {
                Log.trace('InsightFacade::performQuery ERROR: ' + e);
                reject({code: 400, body: e});
            }
        });
    }

    public checkMissingDatasets(query: QueryRequest): string[] {

        var gMissing: string[] = this.missingFromGET(query.GET);
        var wMissing: string[] = this.missingFromWHERE(query.WHERE, []);

        for (var i in wMissing) {
            if (gMissing.indexOf(wMissing[i]) == -1) {
                gMissing.push(wMissing[i]);
            }
        }

        return gMissing;
    }

    public missingFromGET(GETvalue: string[]): string[] {
        var missing: string[] = [];

        for (var i = 0; i < GETvalue.length; i++) {
            var id = GETvalue[i].split('_')[0];
            if (GETvalue[i].split('_').length != 1) {                   // for D2 cases with no '_'
                if (!this.dataController.memoryContainsDataset(id)) {
                    if (missing.indexOf(id) == -1) {
                        missing.push(id);
                    }
                }
            }
        }
        return missing;
    }

    public missingFromWHERE(WHEREvalue: Object, arr: string[]): string[] {
        var missing: string[] = arr;

        var key = Object.keys(WHEREvalue)[0];
        switch (key) {
            case 'AND':
            case 'OR':
                var list: Object[] = (<any>WHEREvalue)[key];
                for (var i in list) {
                    this.missingFromWHERE(list[i], missing);
                }
                break;
            case 'LT':
            case 'GT':
            case 'EQ':
            case 'IS':
                var operand: Object = (<any>WHEREvalue)[key];
                var next = Object.keys(operand)[0];
                var id: string = next.split('_')[0];
                if (next.split('_').length != 1) {                          // for D2 cases with no '_'
                    if (!this.dataController.memoryContainsDataset(id)) {
                        if (missing.indexOf(id) == -1) {
                            missing.push(id);
                        }
                    }
                }
                break;
            case 'NOT':
                var o: Object = (<any>WHEREvalue)[key];
                this.missingFromWHERE(o, missing);
                break;
            default:
                break;
        }
        return missing;
    }

}