/**
 * Created by Kirsten on 2016-10-05.
 */

import Log from "../Util";
import Databases from "../controller/DatasetController";
import QueryController from "../controller/QueryController";
import {QueryFilter} from "./QueryFilter";
import KeyTranslator from "./KeyTranslator";
import {ASTNode} from "parse5";
import ParserHelper from "./ParserHelper";
import {RoomData} from "../controller/DatasetController";

export default class RoomsQueryFilter extends QueryFilter {

    protected queriedDataset: RoomData[];

    constructor(data: RoomData[]) {
        super(data);
        this.queriedDataset = data;
    }

    public mathFilter(operator: string, operand: any, negate: boolean): Object[] {       // operand type any rather than {} for compiler

        var firstKey: string = Object.keys(operand)[0];         // operand will only have one k:v pair
        var numberToCompare: number|string = operand[firstKey];
        var categoryToCompare = firstKey.split('_')[1];

        var filteredResults: RoomData[] = [];

        //for (var building = 0; building < Object.keys(this.queriedDataset).length; building++) {
        var rooms: RoomData[] = this.queriedDataset;

        for (var i = 0; i < rooms.length; i++) {
            var thisRoom: any = rooms[i];

            switch (operator) {
                case 'GT':
                    if (negate) {
                        if (!(thisRoom[categoryToCompare] > numberToCompare)) {
                            filteredResults.push(thisRoom);
                        }
                    }
                    else {
                        if (thisRoom[categoryToCompare] > numberToCompare) {
                            filteredResults.push(thisRoom);
                        }
                    }
                    break;
                case 'LT':
                    if (negate) {
                        if (!(thisRoom[categoryToCompare] < numberToCompare)) {
                            filteredResults.push(thisRoom);
                        }
                    }
                    else {
                        if (thisRoom[categoryToCompare] < numberToCompare) {
                            filteredResults.push(thisRoom);
                        }
                    }
                    break;
                case 'EQ':
                    if (negate) {
                        if (!(thisRoom[categoryToCompare] == numberToCompare)) {
                            filteredResults.push(thisRoom);
                        }
                    }
                    else {
                        if (thisRoom[categoryToCompare] == numberToCompare) {
                            filteredResults.push(thisRoom);
                        }
                    }
                    break;
            }

        }
        //}
        return filteredResults;
    }

    public stringFilter(operator: string, operand: {}, negate: boolean): Object[] {
        try {

            var firstKey: string = Object.keys(operand)[0];         // operand will only have one k:v pair
            var categoryToCompare: string = firstKey.split('_')[1];
            var stringToCompare: string = (<any>operand)[firstKey];
            var itemExp: RegExp = this.convertToRegExp(stringToCompare);

            var filteredResults: RoomData[] = [];
            var rooms: RoomData[] = this.queriedDataset;

            for (var i = 0; i < rooms.length; i++) {
                var thisRoom: any = rooms[i];

                if (negate) {
                    if (!(itemExp.test(thisRoom[categoryToCompare]))) {
                        filteredResults.push(thisRoom);
                    }
                }
                else {
                    if (itemExp.test(thisRoom[categoryToCompare])) {
                        filteredResults.push(thisRoom);
                    }
                }
            }
            return filteredResults;
        }
        catch (e) {
            Log.trace('stringFilter ERROR: ' + e);
        }
    }

}