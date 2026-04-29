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
  ViewDidEnter,
  ViewDidLeave
} from '@ionic/angular/standalone';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormsModule, ReactiveFormsModule } from '@angular/forms';
import { addIcons } from 'ionicons';
import { add, alertCircleOutline, arrowBack, arrowForward, pricetag, search, swapVertical } from 'ionicons/icons';
import { debounce, finalize, from, groupBy, interval, mergeMap, Subscription, toArray } from 'rxjs';
import ExpenseModalComponent from '../expense-modal/expense-modal.component';
import { ExpenseService } from '../expense.service';
import { ToastService } from '../../shared/service/toast.service';
import { Category, Expense, ExpenseCriteria, SortOption } from '../../shared/domain';
import { CategoryService } from '../../category/category.service';

interface ExpenseGroup {
  date: string;
  expenses: Expense[];
}

@Component({
  selector: 'app-expense-list',
  templateUrl: './expense-list.component.html',
  styles: [`
    .category-note {
      min-width: 120px;
      text-align: right;
      display: flex;
      align-items: center;
      justify-content: flex-end;
      gap: 4px;
      color: #1a1a1a !important;
      font-weight: 500;
      font-size: 16px;
    }
    .amount-note {
      min-width: 100px;
      text-align: right;
      color: #1a1a1a !important;
      font-weight: 500;
      font-size: 16px;
    }
    ion-item-divider {
      --color: #1a1a1a;
      font-weight: 600;
    }
  `],
  imports: [
    CommonModule,
    ReactiveFormsModule,
    FormsModule,
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
export default class ExpenseListComponent implements ViewDidEnter, ViewDidLeave {
  // DI
  private readonly modalCtrl = inject(ModalController);
  private readonly expenseService = inject(ExpenseService);
  private readonly categoryService = inject(CategoryService);
  private readonly toastService = inject(ToastService);
  private readonly formBuilder = inject(FormBuilder);

  // State
  date = set(new Date(), { date: 1 });
  expenseGroups: ExpenseGroup[] | null = null;
  categories: Category[] = [];
  readonly initialSort = 'date,desc';
  lastPageReached = false;
  loading = false;
  searchCriteria: ExpenseCriteria = {
    page: 0,
    size: 25,
    sort: this.initialSort,
    yearMonth: format(this.date, 'yyyyMM')
  };
  readonly searchForm = this.formBuilder.group({
    name: [''],
    categoryIds: [[] as string[]],
    sort: [this.initialSort]
  });
  private searchFormSubscription?: Subscription;
  readonly sortOptions: SortOption[] = [
    { label: 'Created at (newest first)', value: 'createdAt,desc' },
    { label: 'Created at (oldest first)', value: 'createdAt,asc' },
    { label: 'Date (newest first)', value: 'date,desc' },
    { label: 'Date (oldest first)', value: 'date,asc' },
    { label: 'Name (A-Z)', value: 'name,asc' },
    { label: 'Name (Z-A)', value: 'name,desc' }
  ];

  // Lifecycle
  constructor() {
    addIcons({ swapVertical, pricetag, search, alertCircleOutline, add, arrowBack, arrowForward });
  }

  ionViewDidEnter(): void {
    this.loadAllCategories();
    this.searchFormSubscription = this.searchForm.valueChanges
      .pipe(debounce(searchParams => interval(searchParams.name?.length ? 400 : 0)))
      .subscribe(searchParams => {
        this.searchCriteria = { ...this.searchCriteria, ...(searchParams as Partial<ExpenseCriteria>), page: 0 };
        this.loadExpenses();
      });
    this.loadExpenses();
  }

  ionViewDidLeave(): void {
    this.searchFormSubscription?.unsubscribe();
    this.searchFormSubscription = undefined;
  }

  // Actions
  addMonths = (number: number): void => {
    this.date = addMonths(this.date, number);
    this.searchCriteria.yearMonth = format(this.date, 'yyyyMM');
    this.reloadExpenses();
  };

  async openModal(expense?: Expense): Promise<void> {
    const modal = await this.modalCtrl.create({
      component: ExpenseModalComponent,
      componentProps: { expense: expense ?? {} }
    });
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

  // Color helper
  getCategoryColor(categoryName?: string): string {
    if (!categoryName) return '';

    // Index der kategorie in der categories liste
    const index = this.categories.findIndex(c => c.name === categoryName);
    if (index === -1) return '#999';

    // Goldener winkel für maximale streuung
    const hue = (index * 137.508) % 360;
    return `hsl(${hue}, 70%, 50%)`;
  }

  // Helpers
  private loadAllCategories(): void {
    this.categoryService.getAllCategories({ sort: 'name,asc' }).subscribe({
      next: categories => (this.categories = categories),
      error: error => this.toastService.displayWarningToast('Could not load categories', error)
    });
  }

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
