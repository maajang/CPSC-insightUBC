/**
 * Created by rtholmes on 2016-06-19.
 */

import {Datasets, RoomData} from "./DatasetController";
import Log from "../Util";
import {QueryFilter} from "../tools/QueryFilter";
import ParserHelper from "../tools/ParserHelper";
import HTMLParser from "../tools/HTMLParser";
import List = Mocha.reporters.List;
import QueryValidator from "../tools/QueryValidator";
import KeyTranslator from "../tools/KeyTranslator";
import CourseQueryFilter from "../tools/CourseQueryFilter";
import RoomsQueryFilter from "../tools/RoomsQueryFilter";

export interface QueryRequest {
    GET: string[];
    WHERE: {};
    GROUP?: string[];
    APPLY?: Object[];
    ORDER?: string|Object;
    AS: string;
}

export interface QueryResponse {
    render: string;
    result: Object[];
}


export default class QueryController {
    private datasets: Datasets = null;

    constructor(datasets: Datasets) {
        this.datasets = datasets;
    }

    public isValid(query: QueryRequest): boolean {
        var q: QueryValidator = new QueryValidator(query);
        return q.isValid();
    }

    public query(query: QueryRequest): QueryResponse {
        try {

            var datasetID = query['GET'][0].split('_')[0];
            let filteredData = this.handleWHERE(datasetID, query.WHERE);        // WHERE

            if ('GROUP' in query) {
                var arrayOfGroups: Object[][] = this.groupData(filteredData, query.GROUP);      // GROUP
                filteredData = this.applyToData(arrayOfGroups, query.APPLY, query.GROUP, datasetID);

            }

            filteredData = this.selectCategories(datasetID, filteredData, query.GET);      // GET

            Log.trace('Categories selected');

            if ('ORDER' in query) {
                if (typeof query.ORDER == 'string') {
                    filteredData = this.orderResultsStringVal(filteredData, <string>query.ORDER);    // ORDER D1
                }
                else {
                    filteredData = this.orderResultsObjVal(filteredData, <Object>query.ORDER);      // ORDER D2
                }
            }

            return {render: query['AS'], result: filteredData};                     // AS
        }
        catch (e) {
            Log.trace('QueryController::query ERROR: ' + e);
        }
    }

    public applyToData(dataArrays: Object[][], apply: any, group: string[], datasetID: string): Object[] {

        var groupedResults: Object[] = [];

        for (var arr = 0; arr < dataArrays.length; arr++) {
            var currObj: any = {};
            for (var s in group) {
                var firstArrElement = dataArrays[arr][0];
                var category = KeyTranslator.getKeyName(group[s].split('_')[1]);
                var firstArrValAtKey = (<any>firstArrElement)[category];
                currObj[category] = firstArrValAtKey;
            }
            for (var i = 0; i < apply.length; i++) {
                var objKey = Object.keys(apply[i])[0];
                //if (datasetID == 'courses') {
                currObj[objKey] = this.doApplyCalculation(dataArrays[arr], apply[i][objKey]);
                //}
                //else if (datasetID == 'rooms') {
                //    currObj[objKey] = RoomsQueryController.doApplyCalculation(<RoomData[]>dataArrays[arr], apply[i][objKey]);
                //}
            }
            groupedResults.push(currObj);
        }

        return groupedResults;
    }

    public doApplyCalculation(data: any, calculation: any): number {        // data is really Object[]
        var operator = Object.keys(calculation)[0];
        var _field: string = calculation[operator];
        var field = KeyTranslator.getKeyName(_field.split('_')[1]);

        switch (operator) {
            case 'MIN':
                var min: number = (<any>data[0])[field];
                for (var i = 1; i < data.length; i++) {
                    min = Math.min(min, data[i][field]);
                }
                return min;

            case 'MAX':
                var max: number = (<any>data[0])[field];
                for (var i = 1; i < data.length; i++) {
                    max = Math.max(max, data[i][field]);
                }
                return max;

            case 'AVG':
                var total: number = (<any>data[0])[field];
                for (var i = 1; i < data.length; i++) {
                    total = total + data[i][field];
                }
                return +(total / data.length).toFixed(2);                 // round to 2 decimal places

            case 'COUNT':
                var count: number = 0;
                var uniqueVals: number[] = [];
                for (var i = 0; i < data.length; i++) {
                    if (uniqueVals.indexOf(data[i][field]) == -1) {
                        uniqueVals.push(data[i][field]);
                    }
                }
                return uniqueVals.length;
        }

    }

    public selectCategories(datasetID: string, filteredData: Object[], categories: string[]): Object[] {
            var selectedData: Object[] = [];

            for (var i = 0; i < filteredData.length; i++) {
                var newObj: any = {};
                for (var j = 0; j < categories.length; j++) {
                    var category: string; //= categories[j].split('_')[1];
                    if (categories[j].split('_').length == 2) {
                        if (datasetID == 'courses') {
                            category = KeyTranslator.getKeyName(categories[j].split('_')[1]);
                        }
                        else {
                            category = categories[j].split('_')[1];
                        }
                    }
                    else {
                        category = categories[j];
                    }

                    newObj[categories[j]] = (<any>filteredData[i])[category];

                }

                selectedData.push(newObj);
            }
            return selectedData;
    }


    public groupData(data: Object[], group: string[]): Object[][] {
        try {
            var arrOfGroups: Object[][] = [];
            var currArr: Object[];

            for (var k = 0; k < data.length; k++) {
                if (data[k] == null) {
                    continue;
                }
                currArr = [];
                var currElement: any = data[k];
                currArr.push(currElement);
                loop1:
                    for (var i = 0; i < data.length; i++) {
                        if (data[i] == null || k == i) {
                            continue;
                        }
                        for (var j = 0; j < group.length; j++) {
                            var keyName = KeyTranslator.getKeyName(group[j].split('_')[1]);
                            var a = (<any>data[i])[keyName];
                            //Log.trace(a);
                            var b = currElement[keyName];
                            //Log.trace(b);
                            if (a != b) {
                                continue loop1;
                            }
                        }
                        currArr.push(data[i]);
                        data[i] = null;
                    }
                data[k] = null;
                arrOfGroups.push(currArr);
                //Log.trace('oen array complete');
            }
            return arrOfGroups;
        }
        catch (e) {
            Log.trace('QueryController::groupData ERROR: ' + e);
        }
    }

    public handleWHERE(datasetID: string, whereObj: Object): Object[] {

        try {

            var queriedDataset: Object|Object[] = this.datasets[datasetID];
            var filteredData: Object[] = [];

            if (Object.keys(whereObj).length != 0) {


                Log.trace('QueryController::handleWHERE - about to parse query');
                var filterObject: QueryFilter;
                if (datasetID == 'courses') {
                    filterObject = new CourseQueryFilter(queriedDataset);
                }
                else if (datasetID == 'rooms') {
                    filterObject = new RoomsQueryFilter(<RoomData[]> queriedDataset);
                }
                filteredData = filterObject.parseQuery(whereObj, false);
            }
            else {

                if (datasetID == 'courses') {
                    var datasetKeys = Object.keys(queriedDataset);
                    for (var i in datasetKeys) {
                        var ob: Object = (<any>queriedDataset)[datasetKeys[i]];
                        var indiv: Object[] = (<any>ob)['result'];
                        for (var j in indiv) {
                            filteredData.push(indiv[j]);
                        }
                    }
                }
                else if (datasetID == 'rooms') {
                    filteredData = (<Object[]>queriedDataset).slice();
                }
            }
            return filteredData;
        }
        catch (e) {
            Log.trace('QueryController::handleWHERE ERROR: ' + e);
        }
    }


    public orderResultsStringVal(results: Object[], orderBy: string): Object[] {

        var ordered = this.stableSortAscending(results, orderBy);
        return ordered;
    }

    public orderResultsObjVal(filteredData: Object[], qorder: Object): Object[] {
            var results: Object[] = [];

            if ((<any>qorder)['dir'] == 'UP') {
                results = this.stableSortAscending(filteredData, (<any>qorder)['keys']);
            }
            else if ((<any>qorder)['dir'] == 'DOWN') {
                results = this.stableSortDescending(filteredData, (<any>qorder)['keys']);
            }
            else {
                throw new Error('order direction is invalid');
            }
            return results;
    }


    public stableSortAscending(arrToSort: Object[], orderBy: string|string[]): Object[] {
            var sortBy: string;
            if (typeof orderBy != 'string') {
                sortBy = orderBy[0];
            }
            else {
                sortBy = <string>orderBy;
            }

            for (var i in arrToSort) {
                (<any>arrToSort[i])['position'] = i;
            }
            // position needed in order to do stable sort
            // idea from http://blog.vjeux.com/2010/javascript/javascript-sorting-table.html

            arrToSort.sort(function (comp1, comp2) {
                var a: any = comp1;
                var b: any = comp2;
                if (a[sortBy] == b[sortBy]) {
                    if (typeof orderBy != 'string') {
                        for (var i = 1; i < orderBy.length; i++) {
                            if (a[orderBy[i]] < b[orderBy[i]]) {
                                return -1;
                            }
                            else if (a[orderBy[i]] > b[orderBy[i]]) {
                                return 1;
                            }
                        }
                        return a['position'] - b['position'];
                    }
                    else {
                        return a['position'] - b['position'];
                    }
                }
                else if (a[sortBy] < b[sortBy]) {
                    return -1;
                }
                else {
                    return 1;
                }
            });

            for (var j in arrToSort) {
                delete (<any>arrToSort[j])['position'];
            }

            return arrToSort;
    }

    public stableSortDescending(arrToSort: Object[], orderBy: string[]) {
            var sortBy: string = orderBy[0];

            for (var i in arrToSort) {
                (<any>arrToSort[i])['position'] = i;
            }

            arrToSort.sort(function (comp1, comp2) {
                var a: any = comp1;
                var b: any = comp2;
                if (a[sortBy] == b[sortBy]) {
                    for (var i = 1; i < orderBy.length; i++) {
                        if (a[orderBy[i]] > b[orderBy[i]]) {
                            return -1;
                        }
                        else if (a[orderBy[i]] < b[orderBy[i]]) {
                            return 1;
                        }
                    }
                    return a['position'] - b['position'];
                }
                else if (a[sortBy] > b[sortBy]) {
                    return -1;
                }
                else {
                    return 1;
                }
            });

            for (var j in arrToSort) {
                delete (<any>arrToSort[j])['position'];
            }

            return arrToSort;
    }
}
