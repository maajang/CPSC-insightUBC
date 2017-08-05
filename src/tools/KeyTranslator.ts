/**
 * Created by Kirsten on 2016-10-25.
 */

export default class KeyTranslator {

    public static getKeyName(queryKey: string): string {
        switch (queryKey) {
            case 'dept':
                return 'Subject';
            case 'id':
                return 'Course';
            case 'avg':
                return 'Avg';
            case 'instructor':
                return 'Professor';
            case 'title':
                return 'Title';
            case 'pass':
                return 'Pass';
            case 'fail':
                return 'Fail';
            case 'audit':
                return 'Audit';
            case 'uuid':
                return 'id';
            case 'year':
                return 'Year';
            case 'section':
                return 'Section';
            case 'size':
                return 'Size';
            default:
                return queryKey;        // takes care of Rooms dataset cases
        }
    }

    public static getKeyNameHTML(queryKey: string): any {

    }
}
