import { User } from './user.model'

export class Trip {
    public id: number;
    public tripName: string;
    public destination: string;
    public imageUrl: string;
    public dateStart: Date;
    public dateEnd: Date;
    public users: Array<User>;
    
    constructor(id: number,
                tripName: string, 
                destination: string,
                imageUrl: string, 
                dateStart: Date, 
                dateEnd: Date, 
                users: Array<User>
                ) {
                    this.id = id;
                    this.tripName = tripName;
                    this.destination = destination;
                    this.imageUrl = imageUrl;
                    this.dateStart = dateStart;
                    this.dateEnd = dateEnd;
                    this.users = users;
                }
}