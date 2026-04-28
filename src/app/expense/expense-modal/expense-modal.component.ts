import { Component, inject, ViewChild } from '@angular/core';
import {
  IonButton,
  IonButtons,
  IonContent,
  IonDatetime,
  IonDatetimeButton,
  IonFab,
  IonFabButton,
  IonHeader,
  IonIcon,
  IonInput,
  IonItem,
  IonModal,
  IonNote,
  IonSelect,
  IonSelectOption,
  IonTitle,
  IonToolbar,
  ModalController,
  ViewDidEnter,
  ViewWillEnter
} from '@ionic/angular/standalone';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { addIcons } from 'ionicons';
import { add, calendar, cash, close, pricetag, save, text, trash } from 'ionicons/icons';
import CategoryModalComponent from '../../category/category-modal/category-modal.component';
import { format } from 'date-fns';
import { ExpenseService } from '../expense.service';
import { LoadingIndicatorService } from '../../shared/service/loading-indicator.service';
import { ToastService } from '../../shared/service/toast.service';
import { CategoryService } from '../../category/category.service';
import { Category, Expense, ExpenseUpsertDto } from '../../shared/domain';
import { finalize } from 'rxjs';

@Component({
  selector: 'app-expense-modal',
  templateUrl: './expense-modal.component.html',
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
    IonSelect,
    IonSelectOption,
    IonNote,
    IonDatetime,
    IonDatetimeButton,
    IonModal,
    IonFab,
    IonFabButton
  ]
})
export default class ExpenseModalComponent implements ViewDidEnter, ViewWillEnter {
  // DI
  private readonly modalCtrl = inject(ModalController);
  private readonly formBuilder = inject(FormBuilder);
  private readonly expenseService = inject(ExpenseService);
  private readonly categoryService = inject(CategoryService);
  private readonly loadingIndicatorService = inject(LoadingIndicatorService);
  private readonly toastService = inject(ToastService);

  // View Children
  @ViewChild('nameInput') nameInput?: IonInput;

  // Passed into the component by the ModalController
  expense: Expense = {} as Expense;

  // State
  categories: Category[] = [];

  // Form
  readonly expenseForm = this.formBuilder.group({
    id: [null! as string], // hidden
    name: ['', [Validators.required, Validators.maxLength(40)]],
    categoryId: [null! as string | null],
    amount: [null! as number, [Validators.required, Validators.min(0.01)]],
    date: [format(new Date(), 'yyyy-MM-dd'), Validators.required]
  });

  // Lifecycle
  constructor() {
    addIcons({ close, save, text, pricetag, add, cash, calendar, trash });
  }

  ionViewWillEnter(): void {
    this.expenseForm.patchValue({
      ...this.expense,
      categoryId: this.expense.category?.id
    });
  }

  ionViewDidEnter(): void {
    this.nameInput?.setFocus();
    this.loadAllCategories();
  }

  // Helpers
  private loadAllCategories(): void {
    this.categoryService.getAllCategories({ sort: 'name,asc' }).subscribe({
      next: categories => (this.categories = categories),
      error: error => this.toastService.displayWarningToast('Could not load categories', error)
    });
  }

  // Actions
  cancel(): void {
    void this.modalCtrl.dismiss(null, 'cancel');
  }

  save(): void {
    this.loadingIndicatorService.showLoadingIndicator({ message: 'Saving expense' }).subscribe(loadingIndicator => {
      const expense = this.expenseForm.value as ExpenseUpsertDto;
      this.expenseService
        .upsertExpense(expense)
        .pipe(finalize(() => loadingIndicator.dismiss()))
        .subscribe({
          next: () => {
            this.toastService.displaySuccessToast('Expense saved');
            void this.modalCtrl.dismiss(null, 'refresh');
          },
          error: error => this.toastService.displayWarningToast('Could not save expense', error)
        });
    });
  }

  delete(): void {
    void this.modalCtrl.dismiss(null, 'delete');
  }

  async showCategoryModal(): Promise<void> {
    const categoryModal = await this.modalCtrl.create({ component: CategoryModalComponent });
    void categoryModal.present();
    const { role } = await categoryModal.onWillDismiss();
    if (role === 'refresh') this.loadAllCategories();
  }
}
