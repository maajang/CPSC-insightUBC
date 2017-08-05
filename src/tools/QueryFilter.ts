import Log from "../Util";
import Databases from "../controller/DatasetController";
import QueryController from "../controller/QueryController";
import KeyTranslator from "./KeyTranslator";
import {ASTNode} from "parse5";
import ParserHelper from "./ParserHelper";
import HTMLParser from "./HTMLParser";
/**
 * Created by Kirsten on 2016-11-03.
 */

export abstract class QueryFilter {
    protected queriedDataset: {};
    protected parser: HTMLParser;

    constructor(protected data: {}) {
        this.queriedDataset = data;
        this.parser = new HTMLParser(this.queriedDataset);
    }

    abstract mathFilter(operator: string, operand: any, negate: boolean): Object[];

    abstract stringFilter(operator: string, operand: {}, negate: boolean): Object[];

    public parseQuery(whereObj: Object, negate: boolean): Object[] {
        try {
            //Log.trace(JSON.stringify(whereObj));
            var body: any = whereObj;

            var operator: string = Object.keys(body)[0];

            var results: Object[] = [];

            switch (operator) {
                case 'GT':
                case 'LT':
                case 'EQ':
                    var operand1: Object[];
                    operand1 = body[operator];
                    if (negate) {
                        results = this.mathFilter(operator, operand1, true);
                    }
                    else {
                        results = this.mathFilter(operator, operand1, false);
                    }
                    break;
                case 'IS':
                    var operand1: Object[];
                    operand1 = body[operator];
                    if (negate) {
                        results = this.stringFilter(operator, operand1, true);
                    }
                    else {
                        results = this.stringFilter(operator, operand1, false);
                    }
                    break;
                case 'AND':
                case 'OR':
                    var operandsList: Object[][] = body[operator];
                    var parsedOperands: Object[][] = [];
                    if (negate) {
                        for (var i = 0; i < operandsList.length; i++) {
                            var q = this.parseQuery(operandsList[i], true);
                            parsedOperands.push(q);
                        }
                        if (operator == 'AND') {
                            results = this.logicFilter('OR', parsedOperands);       // by DeMorgan's law
                        }
                        else if (operator == 'OR') {
                            results = this.logicFilter('AND', parsedOperands);      // by DeMorgan's law
                        }
                    }
                    else {
                        for (var i = 0; i < operandsList.length; i++) {
                            var q = this.parseQuery(operandsList[i], false);
                            parsedOperands.push(q);
                        }
                        results = this.logicFilter(operator, parsedOperands);
                    }
                    break;
                case 'NOT':
                    if (Object.keys(body[operator])[0] == 'NOT') {                  // case: nested NOTs
                        results = this.parseQuery(body[operator]['NOT'], false);
                    }
                    else {
                        results = this.parseQuery(body[operator], true);
                    }
                    break;
            }
            return results;
        }
        catch (e) {
            Log.trace('QueryFilter::parseQuery ERROR: ' + e);
        }
    }


    public logicFilter(operator: string, operandList: Object[][]): Object[] {

        var operand1: Object[] = operandList[0];
        var operand2: Object[] = operandList[1];

        for (var i = 2; i < operandList.length; i++) {
            switch (operator) {
                case 'AND':
                    operand1 = this.andFunc(operand1, operand2);
                    break;
                case 'OR':
                    operand1 = this.orFunc(operand1, operand2);
            }
            operand2 = operandList[i];
        }
        switch (operator) {
            case 'AND':
                return this.andFunc(operand1, operand2);
            case 'OR':
                return this.orFunc(operand1, operand2);
        }

    }

    public andFunc(operator1: Object[], operator2: Object[]): Object[] {

        var results: Object[] = [];

        if (!operator1 || !operator2 || operator1.length == 0 || operator2.length == 0) {
            return results;
        }
        else {
            for (var i in operator1) {
                if (operator2.indexOf(operator1[i]) != -1) {
                    results.push(operator1[i]);
                }
                // with help from http://stackoverflow.com/questions/10424489/finding-intersection-of-2-arrays-in-node-js
            }
            return results;
        }
    }

    public orFunc(operator1: Object[], operator2: Object[]): Object[] {
        var results: Object[] = [];

        if (!operator1 || operator1.length == 0) {
            results = operator2;
        }
        else if (!operator2 || operator2.length == 0) {
            results = operator1;
        }
        else {
            results = operator1;
            for (var i in operator2) {
                if (results.indexOf(operator2[i]) == -1) {
                    results.push(operator2[i]);
                }
                // with help from http://stackoverflow.com/questions/10424489/finding-intersection-of-2-arrays-in-node-js
            }
        }
        return results;
    }


    public convertToRegExp(str: string): RegExp {

        var pieces: string[] = str.split('*');
        var regVersion: string;

        if (pieces.length == 1) {
            regVersion = '^' + str + '$';
        }
        else if (pieces.length == 3) {
            regVersion = '.*' + pieces[1] + '.*';
        }
        else {
            if (pieces[0] == '') {
                regVersion = '.*' + pieces[1] + '$';
            }
            else if (pieces [1] == '') {
                regVersion = '^' + pieces[0] + '.*';
            }
        }
        return new RegExp(regVersion);
    }

}
