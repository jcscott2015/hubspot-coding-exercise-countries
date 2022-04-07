/**
 * @file Business Logic for processing partners data.
 * @author John C. Scott
 *
 * @requires     NPM:lodash
 */

import _ from 'lodash';

export interface IPartners {
	firstName: string;
	lastName: string;
	email: string;
	country: string;
	availableDates: string[];
};

export interface ICountries {
	attendeeCount: number;
	attendees: string[];
	name: string;
	startDate: string | null;
};

interface IAttendeesByDate {
	[key: string]: string[];
};

interface IHashTable {
	[key: string]: IAttendeesByDate;
};

let hashTable: IHashTable = {};

/**
 * Build countries object -- 0(n^2 + 2n + 1)
 * @param partners IPartners array
 * @returns ICountries array
 */
const countries = (partners: IPartners[]) => {
	partners.forEach(p => { // 0(n)
		// Collect all availableDates by attendee for each country.
		p.availableDates
			.forEach(date => { // exclude those with no date preference -- 0(n)
				const obj = {
					[p.country]: {
						[date]: [p.email]
					}
				};
				_.mergeWith(hashTable, obj, (objValue: string[], srcValue: string[]) => {
					if (_.isArray(objValue)) {
						return objValue.concat(srcValue);
					}
				});
			});
	});

	// Assemble object of countries from all the object arrays.
	// O(1)
	return Object.keys(hashTable).reduce((a: ICountries[], country) => {
		let [minAvail, emails] = findEarliestSeqWithMost(hashTable[country]);
		if (minAvail) {
			if (minAvail in hashTable[country]) {
				emails = hashTable[country][minAvail];
			}
		}
		a.push({
			attendeeCount: emails.length,
			attendees: emails,
			name: country,
			startDate: minAvail
		});
		return a;
	}, []);
};

/**
 * Find dates that are sequential, based on the days sent.
 * @param dates string[]
 * @param days integer - default is 1
 * @returns string[][]
 */
const findSequences = (dates: string[], days = 1) => {
	const dayGap = 1000 * 60 * 60 * 24 * days;
	let start = 0;
	let end = 1;
	return dates.sort().reduce((a: string[][], d, idx, arr) => { // 0(n + n)
		if (idx > 0) {
			if (Date.parse(arr[idx]) - Date.parse(arr[idx - 1]) > dayGap) {
				// Not a sequence. Push array slice. Move start and end cursors.
				const seq = arr.slice(start, end);
				if (seq.length > 1) a.push(seq); // one is not a sequence
				start = end; // set start to end
				end = idx; // set end to current idx
			} else {
				// A sequence; extend slice to next index.
				end = idx + 1; // extend slice
				// One is not a sequence, and if the last slice is a sequence,
				// end has exceeded the array. We need to push it.
				const seq = arr.slice(start, end);
				if ((seq.length > 1) && (end >= arr.length)) {
					a.push(seq);
				}
			}
		}
		return a;
	}, []);
};

/**
 * Find the earliest `days` dates that have the most attendees attending each day.
 * @param dates IAttendeesByDate
 * @param days integer - default is 2
 * @returns [string, string[]]
 */
const findEarliestSeqWithMost = (dates: IAttendeesByDate, days = 2): [string | null, string[]] => {
	let mostAttendedDay: string | null = null;
	let mostAttended: string[] = [];

	// Sort dates by the size of attendee arrays, largest first. 0(n)
	const sortedBySize = Object.keys(dates)
		.sort((a, b) => dates[b].length - dates[a].length);

	// Find sequences of days (narrowed by days * 2), comb through the first index of the
	// returned array, and return values of the first sequence date found, if any. 0(1)
	const seq = findSequences(sortedBySize.slice(0, days * 2));
	if (seq && seq[0][0]) {
		mostAttendedDay = seq[0][0];
		mostAttended = dates[seq[0][0]];
	}
	return [mostAttendedDay, mostAttended];
};

export default countries;