import { Component, inject, ViewChild } from '@angular/core';
import {
  IonButton,
  IonButtons,
  IonContent,
  IonFab,
  IonFabButton,
  IonHeader,
  IonIcon,
  IonInput,
  IonItem,
  IonTitle,
  IonToolbar,
  ModalController,
  ViewDidEnter,
  ViewWillEnter
} from '@ionic/angular/standalone';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { addIcons } from 'ionicons';
import { close, save, text, trash } from 'ionicons/icons';
import { CategoryService } from '../category.service';
import { LoadingIndicatorService } from '../../shared/service/loading-indicator.service';
import { ToastService } from '../../shared/service/toast.service';
import { ActionSheetService } from '../../shared/service/action-sheet.service';
import { Category, CategoryUpsertDto } from '../../shared/domain';
import { finalize, mergeMap } from 'rxjs';

@Component({
  selector: 'app-category-modal',
  templateUrl: './category-modal.component.html',
  imports: [
    ReactiveFormsModule,
    IonHeader,
    IonToolbar,
    IonButtons,
    IonButton,
    IonTitle,
    IonContent,
    IonItem,
    IonIcon,
    IonInput,
    IonFab,
    IonFabButton
  ]
})
export default class CategoryModalComponent implements ViewDidEnter, ViewWillEnter {
  // DI
  private readonly actionSheetService = inject(ActionSheetService);
  private readonly categoryService = inject(CategoryService);
  private readonly formBuilder = inject(FormBuilder);
  private readonly loadingIndicatorService = inject(LoadingIndicatorService);
  private readonly modalCtrl = inject(ModalController);
  private readonly toastService = inject(ToastService);

  // View Children
  @ViewChild('nameInput') nameInput?: IonInput;

  // Passed into the component by the ModalController, available in the ionViewWillEnter
  category: Category = {} as Category;

  // Form
  readonly categoryForm = this.formBuilder.group({
    id: [null! as string], // hidden
    name: ['', [Validators.required, Validators.maxLength(40)]]
  });

  // Lifecycle
  constructor() {
    // Add all used Ionic icons
    addIcons({ close, save, text, trash });
  }

  ionViewWillEnter(): void {
    this.categoryForm.patchValue(this.category);
  }

  ionViewDidEnter(): void {
    this.nameInput?.setFocus();
  }

  // Actions
  cancel(): void {
    void this.modalCtrl.dismiss(null, 'cancel');
  }

  save(): void {
    this.loadingIndicatorService.showLoadingIndicator({ message: 'Saving category' }).subscribe(loadingIndicator => {
      const category = this.categoryForm.value as CategoryUpsertDto;
      this.categoryService
        .upsertCategory(category)
        .pipe(finalize(() => loadingIndicator.dismiss()))
        .subscribe({
          next: () => {
            this.toastService.displaySuccessToast('Category saved');
            void this.modalCtrl.dismiss(null, 'refresh');
          },
          error: error => this.toastService.displayWarningToast('Could not save category', error)
        });
    });
  }

  delete(): void {
    this.actionSheetService
      .showDeletionConfirmation('Are you sure you want to delete this category?')
      .pipe(mergeMap(() => this.loadingIndicatorService.showLoadingIndicator({ message: 'Deleting category' })))
      .subscribe(loadingIndicator => {
        this.categoryService
          .deleteCategory(this.category.id!)
          .pipe(finalize(() => loadingIndicator.dismiss()))
          .subscribe({
            next: () => {
              this.toastService.displaySuccessToast('Category deleted');
              void this.modalCtrl.dismiss(null, 'refresh');
            },
            error: error => this.toastService.displayWarningToast('Could not delete category', error)
          });
      });
  }
}
