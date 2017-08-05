/**
 * Created by Kirsten on 2016-10-05.
 */

import Log from "../Util";
import Databases from "../controller/DatasetController";
import QueryController from "../controller/QueryController";
import KeyTranslator from "./KeyTranslator";
import {QueryFilter} from "./QueryFilter";
import {ASTNode} from "parse5";
import ParserHelper from "./ParserHelper";

export default class CourseQueryFilter extends QueryFilter {

    constructor(data: {}) {
        super(data);
    }


    public mathFilter(operator: string, operand: any, negate: boolean): Object[] {       // operand type any rather than {} for compiler

        var firstKey: string = Object.keys(operand)[0];         // operand will only have one k:v pair
        var numberToCompare: number|string = operand[firstKey];
        var categoryToCompare: string = KeyTranslator.getKeyName(firstKey.split('_')[1]);

        var filteredResults: Object[] = [];
        var keys: string[] = Object.keys(this.queriedDataset);

        for (var i = 0; i < keys.length; i++) {
            var resultsObject: Object[] = <Object[]>(<any>this.queriedDataset)[(<string>keys[i])]['result'];

            for (var p = 0; p < resultsObject.length; p++) {
                var item: any = resultsObject[p];

                switch (operator) {
                    case 'GT':
                        if (negate) {
                            if (!(item[categoryToCompare] > numberToCompare)) {
                                filteredResults.push(item);
                            }
                        }
                        else {
                            if (item[categoryToCompare] > numberToCompare) {
                                filteredResults.push(item);
                            }
                        }
                        break;
                    case 'LT':
                        if (negate) {
                            if (!(item[categoryToCompare] < numberToCompare)) {
                                filteredResults.push(item);
                            }
                        }
                        else {
                            if (item[categoryToCompare] < numberToCompare) {
                                filteredResults.push(item);
                            }
                        }
                        break;
                    case 'EQ':
                        if (negate) {
                            if (!(item[categoryToCompare] == numberToCompare)) {
                                filteredResults.push(item);
                            }
                        }
                        else {
                            if (item[categoryToCompare] == numberToCompare) {
                                filteredResults.push(item);
                            }
                        }
                        break;
                }
            }
        }
        return filteredResults;
    }

    public stringFilter(operator: string, operand: {}, negate: boolean): Object[] {


        var firstKey: string = Object.keys(operand)[0];         // operand will only have one k:v pair
        var categoryToCompare: string = KeyTranslator.getKeyName(firstKey.split('_')[1]);
        var stringToCompare: string = (<any>operand)[firstKey];
        var itemExp: RegExp = this.convertToRegExp(stringToCompare);

        var filteredResults: Object[] = [];
        var keys: string[] = Object.keys(this.queriedDataset);

        for (var i = 0; i < keys.length; i++) {
            var resultsObject: Object[] = (<any>this.queriedDataset)[(<string>keys[i])]['result'];

            for (var p = 0; p < resultsObject.length; p++) {
                var item: any = resultsObject[p];

                if (negate) {
                    if (!(itemExp.test(item[categoryToCompare]))) {
                        filteredResults.push(item);
                    }
                }
                else {
                    if (itemExp.test(item[categoryToCompare])) {
                        filteredResults.push(item);
                    }
                }
            }
        }
        return filteredResults;
    }
}