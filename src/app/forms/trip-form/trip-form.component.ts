import { Component, OnInit, Output, EventEmitter } from '@angular/core';
import { ActivatedRoute, Params, Router } from '@angular/router';
import { FormGroup, FormControl, FormArray, Validators } from '@angular/forms';

import { debounceTime, switchMap } from 'rxjs/operators';
import { pipe, Observer } from 'rxjs';

import { TripService } from 'src/app/services/trip.service';
import { UserService } from 'src/app/services/user.service';
import { DestinationService } from 'src/app/services/destination.service';
import { ITripPreview } from 'src/app/interfaces/trip.interface';

@Component({
  selector: 'app-trip-form',
  templateUrl: './trip-form.component.html',
  styleUrls: ['./trip-form.component.scss']
})
export class TripFormComponent implements OnInit {
  id: number;
  editMode = false;
  tripForm: FormGroup;

  destinationOptions: any[] = [];
  // To use when getting link
  historySearchCities: any[] = [];
  tripFormValues: ITripPreview = {
    tripName: '',
    destination: '',
    imageUrl: '',
    startDate: '',
    endDate: '',
    participants: []
  };

  @Output() dataFromCreateTripEvent = new EventEmitter<ITripPreview>();

  constructor(private route: ActivatedRoute,
              private router: Router,
              private tripService: TripService,
              private userService: UserService,
              private destinationService: DestinationService) { }

  sendDatasToPreview() {
    this.dataFromCreateTripEvent.emit(this.tripFormValues);
  }

  ngOnInit() {
    this.route.params
    .subscribe(
      (params: Params) => {
        this.id = +params['id'];
        this.editMode = params['id'] != null;
        this.initForm();
      }
      )
    this.onAutocomplete();
    this.sendDatasToPreview();
  }

onAutocomplete(): void {
    // this.sendDestinations();
    this.tripForm
      .get('destination')
      .valueChanges
      .pipe(
        // debounceTime(10000),
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
    // this.tripFormValues.imageUrl = city._links["city:item"].href;
    return city ? city.matching_full_name : undefined;
  }


  onBlurTripNameInput(value: string) {
    this.tripFormValues.tripName = value;
  }

  
  
  onBlurDestinationInput(value: string) {
    // Get destination name
    this.tripFormValues.destination = value;
    // Get destination image from api
    let cityObject = this.historySearchCities.find(item => {
      return item.matching_full_name === value;
    });
    let link = cityObject ? cityObject._links["city:item"].href : null;
    
    if (link) {
      this.destinationService.getUrbanAreasLink(link) 
      .pipe(
        // debounceTime(10000),
        switchMap((response: any) => this.destinationService.getCityImageLink(JSON.parse(response._body)._links["city:urban_area"].href)),
        switchMap((response: any) => this.destinationService.getDestinationImage(JSON.parse(response._body)._links["ua:images"].href))
      )
      .subscribe(
        (response: any) => {
          console.log(JSON.parse(response._body).photos[0].image.web);
          this.tripFormValues.imageUrl = JSON.parse(response._body).photos[0].image.web;
        },
        (error) => {
          console.log(error);
        }
      );
    };
  }
      
  onBlurStartDateInput(value: string) {
    this.tripFormValues.startDate = value;
  }
  
  onBlurEndDateInput(value: string) {
    this.tripFormValues.endDate = value;
  }

  // test(value) {
  //   console.log(value);
  // }
  
  // onBlurParticipantInput(value: string) {
  //   console.log(value);
  //   if (value !== "") this.tripFormValues.participants.push(value);
  // }

  onSubmit() {
    if (this.editMode) {
        this.tripService.updateTrip(this.id, this.tripForm.value);
      for (let user of this.tripForm.value.users) {
        if (!this.userService.checkIfUserExists(user.email)) {
          this.userService.createUser(user, this.tripForm.value);
        }
      }
    } else {
      this.tripService.createTrip(this.tripForm.value);
      for (let user of this.tripForm.value.users) {
        if (!this.userService.checkIfUserExists(user.email)) {
          this.userService.createUser(user, this.tripForm.value);
        }
      }
    }
    this.router.navigate(['./myTrips', 1]); 
    this.tripForm.reset();
  }

  private initForm() {
    let id = '';
    let tripName = '';
    let destination = '';
    let imageUrl = '';
    let startDate: Date;
    let endDate: Date;
    let users = new FormArray([]);

    if (this.editMode) {
      const trip = this.tripService.getTrip(this.id);
      tripName = trip.tripName;
      destination = trip.destination;
      imageUrl = trip.imageUrl;
      startDate = trip.startDate;
      endDate = trip.endDate;
      if (trip['users']) {
        for (let user of trip.users) {
          users.push(
            new FormGroup({
              'username': new FormControl(user.username),
              'email': new FormControl(user.email)
            })
          );
        }
      }
    }

    this.tripForm = new FormGroup({
      'tripName': new FormControl(tripName),
      'destination': new FormControl(destination),
      'imageUrl': new FormControl(imageUrl),
      'startDate': new FormControl(startDate),
      'endDate': new FormControl(endDate),
      'users': users
    });
    this.onAddAnotherUser();
  }

  onAddAnotherUser() {
    (<FormArray>this.tripForm.get('users')).push(
      new FormGroup({
        'username': new FormControl(null, Validators.required),
        'email': new FormControl(null, Validators.required)
      })
    );
    // console.log(this.tripForm.get('users').value[this.tripForm.get('users').value.length - 1].username);
    // if (this.tripForm.get('users').value[this.tripForm.get('users').value.length - 1].username) {
    //   this.tripFormValues.participants = this.tripForm.get('users').value;
    // }
    this.tripFormValues.participants = this.tripForm.get('users').value;
    this.tripFormValues.participants.splice(-1,1);
  }
}
