import { Component } from '@angular/core';
import { FormControl, FormGroup, ReactiveFormsModule } from '@angular/forms';
import { MatFormFieldModule } from '@angular/material/form-field';
import { FileFormControlComponent } from '../file-control/file-control.component';

@Component({
  selector: 'app-file-upload',
  imports: [
    FileFormControlComponent,
    MatFormFieldModule,
    ReactiveFormsModule
  ],
  templateUrl: './file-upload.html',
  styleUrl: './file-upload.scss',
})
export default class FileUpload {
  userForm = new FormGroup({
    cv: new FormControl(null)
  })
}
