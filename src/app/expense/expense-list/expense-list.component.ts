import { Component, inject } from '@angular/core';
import { addMonths, format, set } from 'date-fns';
import {
  IonButton,
  IonButtons,
  IonCol,
  IonContent,
  IonFab,
  IonFabButton,
  IonGrid,
  IonHeader,
  IonIcon,
  IonInput,
  IonItem,
  IonLabel,
  IonMenuButton,
  IonNote,
  IonProgressBar,
  IonRow,
  IonSelect,
  IonSelectOption,
  IonSkeletonText,
  IonTitle,
  IonToolbar,
  ModalController,
  ViewDidEnter
} from '@ionic/angular/standalone';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule } from '@angular/forms';
import { addIcons } from 'ionicons';
import { add, alertCircleOutline, arrowBack, arrowForward, pricetag, search, swapVertical } from 'ionicons/icons';
import { finalize } from 'rxjs';
import ExpenseModalComponent from '../expense-modal/expense-modal.component';
import { ExpenseService } from '../expense.service';
import { ToastService } from '../../shared/service/toast.service';
import { Expense, ExpenseCriteria } from '../../shared/domain';

@Component({
  selector: 'app-expense-list',
  templateUrl: './expense-list.component.html',
  imports: [
    CommonModule,
    ReactiveFormsModule,
    IonHeader,
    IonToolbar,
    IonButtons,
    IonButton,
    IonMenuButton,
    IonTitle,
    IonContent,
    IonGrid,
    IonRow,
    IonCol,
    IonItem,
    IonIcon,
    IonSelect,
    IonSelectOption,
    IonInput,
    IonLabel,
    IonNote,
    IonFab,
    IonFabButton,
    IonProgressBar,
    IonSkeletonText
  ]
})
export default class ExpenseListComponent implements ViewDidEnter {
  // DI
  private readonly modalCtrl = inject(ModalController);
  private readonly expenseService = inject(ExpenseService);
  private readonly toastService = inject(ToastService);

  // State
  date = set(new Date(), { date: 1 });
  expenses: Expense[] | null = null;
  readonly initialSort = 'date,desc';
  lastPageReached = false;
  loading = false;
  searchCriteria: ExpenseCriteria = {
    page: 0,
    size: 25,
    sort: this.initialSort,
    yearMonth: format(this.date, 'yyyy-MM')
  };

  // Lifecycle
  constructor() {
    addIcons({ swapVertical, pricetag, search, alertCircleOutline, add, arrowBack, arrowForward });
  }

  ionViewDidEnter(): void {
    this.loadExpenses();
  }

  // Actions
  addMonths = (number: number): void => {
    this.date = addMonths(this.date, number);
    this.searchCriteria.yearMonth = format(this.date, 'yyyy-MM');
    this.expenses = null;
    this.searchCriteria.page = 0;
    this.loadExpenses();
  };

  async openModal(): Promise<void> {
    const modal = await this.modalCtrl.create({ component: ExpenseModalComponent });
    void modal.present();
    const { role } = await modal.onWillDismiss();
    console.log('role', role);
  }

  // Helpers
  private loadExpenses(): void {
    this.loading = true;
    this.expenseService
      .getExpenses(this.searchCriteria)
      .pipe(finalize(() => (this.loading = false)))
      .subscribe({
        next: expenses => {
          if (this.searchCriteria.page === 0 || !this.expenses) this.expenses = [];
          this.expenses.push(...expenses.content);
          this.lastPageReached = expenses.last;
        },
        error: error => this.toastService.displayWarningToast('Could not load expenses', error)
      });
  }
}
