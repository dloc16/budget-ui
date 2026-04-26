import { Component, inject } from '@angular/core';
import { addMonths, format, set } from 'date-fns';
import {
  InfiniteScrollCustomEvent,
  IonButton,
  IonButtons,
  IonCol,
  IonContent,
  IonFab,
  IonFabButton,
  IonGrid,
  IonHeader,
  IonIcon,
  IonInfiniteScroll,
  IonInfiniteScrollContent,
  IonInput,
  IonItem,
  IonItemDivider,
  IonLabel,
  IonMenuButton,
  IonNote,
  IonProgressBar,
  IonRefresher,
  IonRefresherContent,
  IonRow,
  IonSelect,
  IonSelectOption,
  IonSkeletonText,
  IonTitle,
  IonToolbar,
  ModalController,
  RefresherCustomEvent,
  ViewDidEnter
} from '@ionic/angular/standalone';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule } from '@angular/forms';
import { addIcons } from 'ionicons';
import { add, alertCircleOutline, arrowBack, arrowForward, pricetag, search, swapVertical } from 'ionicons/icons';
import { finalize, from, groupBy, mergeMap, toArray } from 'rxjs';
import ExpenseModalComponent from '../expense-modal/expense-modal.component';
import { ExpenseService } from '../expense.service';
import { ToastService } from '../../shared/service/toast.service';
import { Expense, ExpenseCriteria } from '../../shared/domain';

interface ExpenseGroup {
  date: string;
  expenses: Expense[];
}

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
    IonItemDivider,
    IonIcon,
    IonSelect,
    IonSelectOption,
    IonInput,
    IonLabel,
    IonNote,
    IonFab,
    IonFabButton,
    IonProgressBar,
    IonSkeletonText,
    IonRefresher,
    IonRefresherContent,
    IonInfiniteScroll,
    IonInfiniteScrollContent
  ]
})
export default class ExpenseListComponent implements ViewDidEnter {
  // DI
  private readonly modalCtrl = inject(ModalController);
  private readonly expenseService = inject(ExpenseService);
  private readonly toastService = inject(ToastService);

  // State
  date = set(new Date(), { date: 1 });
  expenseGroups: ExpenseGroup[] | null = null;
  readonly initialSort = 'date,desc';
  lastPageReached = false;
  loading = false;
  searchCriteria: ExpenseCriteria = {
    page: 0,
    size: 25,
    sort: this.initialSort,
    yearMonth: format(this.date, 'yyyyMM')
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
    this.searchCriteria.yearMonth = format(this.date, 'yyyyMM');
    this.reloadExpenses();
  };

  async openModal(): Promise<void> {
    const modal = await this.modalCtrl.create({ component: ExpenseModalComponent });
    void modal.present();
    const { role } = await modal.onWillDismiss();
    if (role === 'refresh') this.reloadExpenses();
  }

  reloadExpenses($event?: RefresherCustomEvent): void {
    this.searchCriteria.page = 0;
    this.loadExpenses(() => $event?.target.complete());
  }

  loadNextExpensePage($event: InfiniteScrollCustomEvent): void {
    this.searchCriteria.page++;
    this.loadExpenses(() => $event.target.complete());
  }

  // Helpers
  private loadExpenses(next: () => void = (): void => undefined): void {
    this.loading = true;
    this.expenseService
      .getExpenses(this.searchCriteria)
      .pipe(
        finalize(() => {
          this.loading = false;
          next();
        })
      )
      .subscribe({
        next: expenses => {
          if (this.searchCriteria.page === 0 || !this.expenseGroups) this.expenseGroups = [];
          this.lastPageReached = expenses.last;
          // Group expenses by date
          from(expenses.content)
            .pipe(
              groupBy(expense => expense.date),
              mergeMap(group => group.pipe(toArray()))
            )
            .subscribe(expensesByDate => {
              const date = expensesByDate[0].date;
              const existingGroup = this.expenseGroups?.find(group => group.date === date);
              if (existingGroup) existingGroup.expenses.push(...expensesByDate);
              else this.expenseGroups?.push({ date, expenses: expensesByDate });
            });
        },
        error: error => this.toastService.displayWarningToast('Could not load expenses', error)
      });
  }
}
