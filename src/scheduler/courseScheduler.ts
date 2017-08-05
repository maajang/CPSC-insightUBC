/**
 * Created by Kirsten on 2016-11-16.
 */


export interface Section {
    department: string,
    courseNo: string,
    size: number,
    block: number,
    indicesOfSameCourse: number[]
};

export interface RoomAndBlock {
    building: string,
    roomNo: string
    //capacity: number
    //block: number                         // do we need to do two semesters???
};

export default class courseScheduler {

    // constraints (in order of priority)
    // - room.size >= section.size
    // - sections of same course not scheduled at same time
    // - sections are scheduled to run between 8am and 5pm

    private roomsDataset: Object[];
    private coursesDataset: Object[];

    private sectionsToSchedule: Object[];       // order as priority queue by section size
    private possibleRooms: Object[][];
    private possibleBlocks: number[][];

    // indices of sections on which to check constraints
    // when a section is changed the following courses will be added here:
    // - other sections of the same course
    // - sections of the same or lesser size (ones of same size + all indices that follow the current one in sectionsToSchedule)
    private todoList: number[];

    constructor() {
        this.sectionsToSchedule = [];
        this.possibleRooms = [];
    }

    public schedule(inputDepartments: string[], inputCourseNumbers: string[], inputBuildings: string[]) {

        this.createSectionsToSchedule(inputDepartments, inputCourseNumbers, inputBuildings);

    }

    public getSpecifiedCourseNames(depts: string[], nums: string[]): string[] {
        var courseNames: string[];
        for (var d in depts) {
            for (var n in nums) {
                courseNames.push(d + n);
            }
        }
        return courseNames;
    }


// calculate number of sections required for each course in course input list
    public createSectionsToSchedule(inputDepartments: string[], inputCourseNumbers: string[], inputBuildings: string[]) {
        if (!inputDepartments) {
            var keys = Object.keys(this.coursesDataset);

            // case: schedule for all departments, all course numbers
            if (!inputCourseNumbers) {
                for (var i = 0; i < keys.length; i++) {
                    this.createSections(keys[i]);
                }
            }
            // case: schedule for all departments, certain course numbers
            else {
                for (var j = 0; j < keys.length; j++) {
                    var cNo:string = keys[j].slice(4,keys[j].length);  // is slice index inclusive or not
                    if (inputCourseNumbers.indexOf(cNo) != -1) {
                        this.createSections(keys[j]);
                    }
                }
            }
        }
        // case: schedule for certain departments, all course numbers
        else if (!inputCourseNumbers) {
            for (var k = 0; k < keys.length; k++) {
                var cNo:string = keys[k].slice(0,3);  // is slice index inclusive or not
                if (inputCourseNumbers.indexOf(cNo) != -1) {
                    this.createSections(keys[k]);
                }
            }
        }
        // case: departments and course numbers are specified by user
        else {
            this.getSpecifiedCourseNames(inputDepartments, inputCourseNumbers);
        }
    }

    // determines how many sections need to be created and what size they need to be
    // then creates the appropriate number of Section objects
    public createSections(courseName: string):Object {
        var thisCourseData:any = (<any>this.coursesDataset)[courseName]['results'];    // type: Object[]

        return {};
    }
// create subset of rooms that meet conditions of room input list


// check that datasets are loaded

}