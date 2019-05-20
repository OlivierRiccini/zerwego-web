import { Component, OnInit } from '@angular/core';
import { FormGroup, FormBuilder, Validators, ControlContainer, FormControl } from '@angular/forms';
import { AuthService } from 'src/app/services/auth.service';
import { AuthComponent } from './auth.component';
import { MatDialog, MatDialogRef, MatStepper } from '@angular/material';
import { Router } from '@angular/router';
import { HomeComponent } from '../home/home.component';
import { UserInterfaceService } from '../services/user-interface.service';
import { SocialService } from '../services/social.service';
import { IForgotPassword } from '../models/auth';
import { ContactMode } from '../models/shared';

@Component({
  selector: 'app-signin',
  templateUrl: './auth.component.html',
  styleUrls: ['./auth.component.scss']
})
export class SigninComponent extends AuthComponent implements OnInit {

  public forgotPasswordForm: FormGroup;
  authForm: FormGroup;
  stepper: MatStepper;
  public forgotPasswordButtonLabel: string = 'Send new password';
  public forgotPasswordFormIsSubmited: boolean = false;

  constructor(
    public fb: FormBuilder,
    public authService: AuthService,
    public dialog: MatDialog,
    public dialogRef: MatDialogRef<HomeComponent>,
    public router: Router,
    public userInterfaceService: UserInterfaceService,
    public socialService: SocialService
    ) { 
      super(fb, authService, dialogRef, router, userInterfaceService, socialService);
    }
    
  ngOnInit() {
    super.ngOnInit();
    this.creatForgotPasswordForm();
    this.signInMode = true;
    this.label = {
      title: 'Sign in',
      submit: 'Sign in',
      changeForm: 'I don\t have an account yet'
    };
  }

  public onSubmit() {
    console.log(this.authForm.value);
    if (this.authForm.invalid) {
      return;
    }
    const user = this.authForm.value;
    this.authService.login({type: 'password', email: user.email, password: user.password}).subscribe(
      () => {
        this.dialogRef.close();
      }
    )
  }

  creatForgotPasswordForm() {
    this.forgotPasswordForm = this.fb.group({
      contactMode: ['', [Validators.required]],
      emailForgotPass: ['']
    });
  }

  // public onSelectContactMode(form: FormGroup, contactMode: ContactMode) {
  //   const validators = [ Validators.required ];
  //   let toEnable: string;
  //   let toDisable: string;
  //   if (contactMode === 'email') {
  //     this.forgotPasswordModeIsPhone = false;
  //     this.forgotPasswordModeIsEmail= true;
  //     toEnable = 'emailForgotPass';
  //     toDisable = 'phoneForgotPass';
  //     validators.push(Validators.email);
  //   } else {
  //     this.forgotPasswordModeIsPhone = true;
  //     this.forgotPasswordModeIsEmail= false;
  //     toEnable = 'phoneForgotPass';
  //     toDisable = 'emailForgotPass';
  //   }
  //   form.addControl(toEnable, new FormControl('', validators));
  //   form.removeControl(toDisable);
  // }

  public onSubmitForgotPasswordForm(stepper: MatStepper) {
    this.forgotPasswordFormIsSubmited = true;
    if (!this.forgotPasswordForm.valid) {
      return;
    }
    this.stepper = stepper;
    let type = this.forgotPasswordForm.value.contactMode;
    const contact: IForgotPassword = {type};
    const to = type === 'email' ? 'email' : 'phone';
    contact[to] = type === 'email' ?  this.forgotPasswordForm.value.emailForgotPass : this.forgotPasswordForm.value.phoneForgotPass;
    this.authService.forgotPassword(contact).subscribe(
      res => {
        this.userInterfaceService.success(res);
        this.forgotPasswordForm.reset();
        this.forgotPasswordButtonLabel = 'New password sent!'
        setTimeout(() => this.stepBack(this.stepper), 3000);
      },
      err => this.userInterfaceService.error(err.err.message)
    )
  }

  private stepBack(stepper: MatStepper){
    stepper.previous();
  }

}
