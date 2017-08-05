/**
 * Created by Kirsten on 2016-10-25.
 */

import {QueryRequest} from "../controller/QueryController";

export default class QueryValidator {

    private query: QueryRequest;

    constructor(query: QueryRequest) {
        this.query = query;
    }

    public isValid(): boolean {
        return (typeof this.query !== 'undefined'
            && this.query !== null
            && 'GET' in this.query
            && 'WHERE' in this.query
            && 'AS' in this.query)
            && this.groupisValid()
            && this.applyIsValid()
            && this.getKeysAreValid()
            && this.orderIsValid()
            && this.checkSingleDataset();
    }

    public getKeysAreValid(): boolean {
        var query = this.query;

        if (!('APPLY' in query) || !('GROUP' in query)) {
            return true;
        }

        var getKeys: string[] = query.GET;
        var groupAndApplyKeys: string[] = query.GROUP.slice();

        for (var i in query.APPLY) {
            var key = Object.keys(query.APPLY[i])[0];
            groupAndApplyKeys.push(key);
        }

        for (var j in getKeys) {
            if (groupAndApplyKeys.indexOf(getKeys[j]) == -1) {
                return false;
            }
        }
        for (var k in groupAndApplyKeys) {
            if (getKeys.indexOf(groupAndApplyKeys[k]) == -1) {
                return false;
            }
        }
        return true;
    }


    public checkSingleDataset(): boolean {
        var query = this.query;

        var getKeys: string[] = query.GET;
        var groupAndApplyKeys: string[] = [];

        if ('GROUP' in query) {
            groupAndApplyKeys = query.GROUP.slice();
            for (var k in query.APPLY) {
                var key = Object.keys(query.APPLY[k])[0];
                groupAndApplyKeys.push(key);
            }
        }

        var datasets: string[] = [];
        for (var i = 0; i < getKeys.length; i++) {
            if (getKeys[i].split('_').length != 1) {
                var datasetId: string = getKeys[i].split('_')[0];
                if (datasets.indexOf(datasetId) == -1) {
                    datasets.push(datasetId);
                }
            }
        }
        for (var j = 0; j < groupAndApplyKeys.length; j++) {
            if (getKeys[j].split('_').length != 1) {
                var datasetId: string = groupAndApplyKeys[j].split('_')[0];
                if (datasets.indexOf(datasetId) == -1) {
                    datasets.push(datasetId);
                }
            }
        }

        return datasets.length == 1;
    }


    public groupisValid(): boolean {    // check that keys in APPLY are unique
        var query = this.query;
        if (!('GROUP' in query)) {
            return true;
        }
        for (var s in query.GROUP) {                // all terms in group should be in format id_key
            if (query.GROUP[s].split('_').length != 2) {
                return false;
            }
        }
        return 'APPLY' in query && query.GROUP.length != 0;
    }

    public applyIsValid(): boolean {    // check that keys in APPLY are unique
        var query = this.query;
        if (!('APPLY' in query)) {
            return true;
        }
        for (var s in query.APPLY) {
            if (Object.keys(query.APPLY[s])[0].split('_').length > 1) {
                return false;
            }
        }
        return 'GROUP' in query && query.GROUP.length != 0;
    }

    public orderIsValid(): boolean {
        var query = this.query;
        if (!('ORDER' in query)) {
            return true;
        }

        else if (typeof query.ORDER === 'string') {
            return (query.GET.indexOf(<string>query.ORDER) !== -1);
        }

        var orderKeys = Object.keys(query.ORDER);
        if (orderKeys.length != 2 || orderKeys.indexOf('dir') == -1 || orderKeys.indexOf('keys') == -1) {
            return false;
        }

        else {
            var orderKeys: string[] = (<any>query.ORDER)['keys'];
            if (query.APPLY == null) {
                for (var i in orderKeys) {
                    if (query.GET.indexOf(orderKeys[i]) == -1) {
                        return false;
                    }
                }
            }
            else {
                for (var i in orderKeys) {
                    if (query.GET.indexOf(orderKeys[i]) == -1
                        && Object.keys(query.APPLY).indexOf(orderKeys[i]) == -1) {
                        return false;
                    }
                }
            }
            return true;
        }
    }


}
