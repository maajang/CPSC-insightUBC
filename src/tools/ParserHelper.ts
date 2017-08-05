import {ASTNode} from "parse5";
import Log from "../Util";
/**
 * Created by Kirsten on 2016-11-03.
 */

// to help with parse5 parsing

export default class ParserHelper {

    public static nodeAtPath(startNode: ASTNode, path: string[]): ASTNode {
        var currNode = startNode;

        outerloop:
            for (var i = 0; i < path.length; i++) {
                if (currNode.childNodes != null) {
                    var children = currNode.childNodes;
                    for (var j = 0; j < children.length; j++) {
                        if (children[j].nodeName == path[i]) {
                            currNode = children[j];
                            //Log.trace('found ' + path[i]);
                            continue outerloop;
                        }
                        if (children[j].attrs != null) {
                            var attributes = children[j].attrs;
                            for (var a = 0; a < attributes.length; a++) {
                                var exp = new RegExp(path[i]);
                                if (exp.test(attributes[a].value)) {
                                    currNode = children[j];
                                    //Log.trace('found ' + path[i]);
                                    continue outerloop;
                                }
                            }
                        }
                    }
                    return null;
                }
                return null;
            }
        //Log.trace('loop ending; last value: ' + path[i - 1]);
        return currNode;
    }


    public static removeExcessElements(nodes: ASTNode[]): ASTNode[] {
        var justRooms: ASTNode[] = [];

        for (var i = 1; i < nodes.length; i += 2) {
            justRooms.push(nodes[i]);
        }

        return justRooms;
    }

}
