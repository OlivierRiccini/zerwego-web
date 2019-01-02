import { Component, OnInit, Inject } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { FormGroup, FormArray, FormBuilder } from '@angular/forms';
import { switchMap, startWith } from 'rxjs/operators';
import { TripService } from 'src/app/services/trip.service';
import { UserService } from 'src/app/services/user.service';
import { DestinationService } from 'src/app/services/destination.service';
import { ITrip } from 'src/app/interfaces/trip.interface';
import { IUser } from 'src/app/interfaces/user.interface';
import { MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { TripComponent } from '../trip.component';
import * as moment from 'moment';

@Component({
  selector: 'app-trip-form',
  templateUrl: './trip-form.component.html',
  styleUrls: ['./trip-form.component.scss']
})
export class TripFormComponent implements OnInit {
  id: string;
  editMode = false;
  tripForm: FormGroup;
  participants: FormArray;

  destinationOptions: any[] = [];
  // To use when getting link
  historySearchCities: any[] = [];
  formValues: ITrip = {
    _id: null,
    tripName: '',
    destination: '',
    imageUrl: '',
    startDate: null,
    endDate: null,
    participants: []
  };

  tripToEdit: ITrip;
  username: string;
  email: string;

  greenBtnLabel: string;
  closeDialogLabel: string;
  
  constructor(private route: ActivatedRoute,
    private router: Router,
    private tripService: TripService,
    private userService: UserService,
    private destinationService: DestinationService,
    private fb: FormBuilder,
    public dialogRef: MatDialogRef<TripComponent>,
    @Inject(MAT_DIALOG_DATA) public data: any
    ) { 
      this.editMode = data.mode === 'edit';
      this.id = data.tripId;
    }
  
  sendTripFormValues(): void {
    this.tripService.sendTripFormValues(this.formValues);   
  }
  
  ngOnInit() {
    this.createForm();
    this.onAutocomplete();
  }
    
  private createForm() {
    this.tripForm = this.fb.group({
      tripName: [''],
      destination: [''],
      imageUrl: [''],
      startDate: [''],
      endDate: [''],
      participants: this.fb.array([])
    });
    if (this.editMode) {
      this.tripService.loadTrip(this.id).subscribe(trip => {
        this.formValues = trip; 
        this.tripForm.controls.tripName.setValue(trip.tripName);
        this.tripForm.controls.destination.setValue(trip.destination);
        this.tripForm.controls.imageUrl.setValue(trip.imageUrl);
        this.tripForm.controls.startDate.setValue(moment(trip.startDate).format('YYYY-MM-DD'));
        this.tripForm.controls.endDate.setValue(moment(trip.endDate).format('YYYY-MM-DD'));
        this.tripToEdit = trip;
      });
      this.greenBtnLabel = 'Save Trip';
      this.closeDialogLabel = 'Cancel changes';
    } else {
      this.greenBtnLabel = 'Create Trip';
      this.closeDialogLabel = 'Give up';
    }
    // this.greenBtnLabel = 'Yes, there we go!';
    this.onInputChangesSubscriptions();
  }

onAutocomplete(): void {
  this.tripForm
    .get('destination')
    .valueChanges
    .pipe(
      // debounceTime(10000),
      startWith(''),
      switchMap(value => this.destinationService.searchDestination(value))
    )
    .subscribe(
      (response: any) => {
        let citiesArray: Array<any> = JSON.parse(response._body)._embedded["city:search-results"].slice();
        for (let city of citiesArray) {
          this.destinationOptions = citiesArray;
          this.historySearchCities.push(city);
        }
      },
      (error) => {
        console.log(error);
      }
    );
  }

  displayFn(city?): string | undefined {
    if (city) {
      return city.matching_full_name ? city.matching_full_name : city;
    } else {
      return undefined;
    }
  }

  onInputChangesSubscriptions() {
    this.tripForm.get('tripName').valueChanges.subscribe(
      value => {
        this.formValues.tripName = value;
        this.sendTripFormValues();
      }
    )
  }

  onBlurDestinationInput(value: string) {
    // Get destination name
    this.formValues.destination = value;
    // Get destination image from api
    let cityObject = this.historySearchCities.find(item => {
      return item.matching_full_name === value;
    });
    let link = cityObject ? cityObject._links["city:item"].href : null;
    
    if (link) {
      this.destinationService.getUrbanAreasLink(link) 
      .pipe(
        switchMap((response: any) => this.destinationService.getCityImageLink(JSON.parse(response._body)._links["city:urban_area"].href)),
        switchMap((response: any) => this.destinationService.getDestinationImage(JSON.parse(response._body)._links["ua:images"].href))
      )
      .subscribe(
        (response: any) => {
          this.formValues.imageUrl = JSON.parse(response._body).photos[0].image.web;
          // Get flag
          this.getCountryFlag(value);
          this.sendTripFormValues();
        },
        (error) => {
          console.log(error);
        }
      );
    };
  }

  getCountryFlag(destination) {
    console.log(destination);
    const countryName = destination.split(',')[2].trim();
    this.destinationService.getCountryFlag(countryName)
      .subscribe(resp => {
        this.formValues.countryFlag = JSON.parse(resp._body)[0].flag;
    });
  }
      
  onBlurStartDateInput(value: Date) {
    this.sendTripFormValues();
    this.formValues.startDate = value;
  }
  
  onBlurEndDateInput(value: Date) {
    this.sendTripFormValues();
    this.formValues.endDate = value;
  }

 onSubmit() {
    if (this.editMode) {
      console.log('UPDATE NOT IMPLEMENTED YET');
    } else {
      this.tripService.createTrip(this.formValues)
        .subscribe(
          (response) => {
            console.log('Trip successfully created!');
            const trip: ITrip = response;
            this.tripService.updateLocalStorage(trip);
            this.router.navigate(['./trips', trip._id, 'overview']);
            // this.onCloseDialog();
            this.dialogRef.close();
          },
          (err) => console.log(err)
        );
    }
  }

  onAddAnotherParticipant(username: string, email: string) {
    let userAlreadyExist = this.formValues.participants.findIndex((user: IUser) => {
      return user.email === email;
    });
    if (username && email) {
      if (userAlreadyExist === -1) {
        this.formValues.participants.push({ username, email });
      }
    }
    this.username = '';
    this.email = '';
    this.sendTripFormValues();
  }

  onRemoveParticipant(email) {
    let index = this.formValues.participants.findIndex((user: IUser) => {
      return user.email === email;
    });
    // Remove from values to send
    this.formValues.participants.splice(index, 1);
    this.sendTripFormValues();
  }

  onCloseDialog() {
    this.dialogRef.close();
    if (this.editMode) { 
      this.tripService.loadTrip(this.id, true).subscribe(trip => {
        this.formValues = trip; 
        this.sendTripFormValues();
      });
    } else {
      this.router.navigate(['/'])   
    };
  }
}
