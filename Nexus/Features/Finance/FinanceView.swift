import SwiftUI
import SwiftData
import Charts

struct FinanceView: View {
    @Environment(\.modelContext) private var context
    @Query(sort: \Transaction.date, order: .reverse) private var transactions: [Transaction]
    @State private var showNew = false
    @State private var monthOffset = 0

    private var targetMonth: Date {
        Calendar.current.date(byAdding: .month, value: monthOffset, to: .now) ?? .now
    }

    private var monthTransactions: [Transaction] {
        transactions.filter {
            Calendar.current.isDate($0.date, equalTo: targetMonth, toGranularity: .month)
        }
    }

    private var expenseTotal: Decimal {
        monthTransactions.filter { $0.kind == .expense }.reduce(0) { $0 + $1.amount }
    }
    private var incomeTotal: Decimal {
        monthTransactions.filter { $0.kind == .income }.reduce(0) { $0 + $1.amount }
    }

    private var byCategory: [(category: String, total: Decimal)] {
        Dictionary(grouping: monthTransactions.filter { $0.kind == .expense }, by: \.category)
            .map { (category: $0.key, total: $0.value.reduce(0) { $0 + $1.amount }) }
            .sorted { $0.total > $1.total }
    }

    var body: some View {
        NavigationStack {
            List {
                Section {
                    monthSelector
                    summaryCard
                    if !byCategory.isEmpty { categoryChart }
                }
                Section("履歴") {
                    if monthTransactions.isEmpty {
                        Text("この月の記録はありません").foregroundStyle(.secondary)
                    }
                    ForEach(monthTransactions) { tx in
                        TransactionRow(tx: tx)
                            .swipeActions {
                                Button(role: .destructive) { context.delete(tx) } label: {
                                    Label("削除", systemImage: "trash")
                                }
                            }
                    }
                }
            }
            .navigationTitle("家計簿")
            .toolbar { Button { showNew = true } label: { Image(systemName: "plus") } }
            .sheet(isPresented: $showNew) { NewTransactionView() }
        }
    }

    private var monthSelector: some View {
        HStack {
            Button { monthOffset -= 1 } label: { Image(systemName: "chevron.left") }
            Spacer()
            Text(targetMonth, format: .dateTime.year().month(.wide)).font(.headline)
            Spacer()
            Button { monthOffset += 1 } label: { Image(systemName: "chevron.right") }
                .disabled(monthOffset >= 0)
        }
        .buttonStyle(.borderless)
    }

    private var summaryCard: some View {
        HStack(spacing: 16) {
            VStack(alignment: .leading) {
                Text("支出").font(.caption).foregroundStyle(.secondary)
                Text(expenseTotal.yenString).font(.title3.bold()).foregroundStyle(.red)
            }
            Divider()
            VStack(alignment: .leading) {
                Text("収入").font(.caption).foregroundStyle(.secondary)
                Text(incomeTotal.yenString).font(.title3.bold()).foregroundStyle(.green)
            }
            Divider()
            VStack(alignment: .leading) {
                Text("収支").font(.caption).foregroundStyle(.secondary)
                Text((incomeTotal - expenseTotal).yenString).font(.title3.bold())
            }
        }
        .frame(maxWidth: .infinity)
    }

    private var categoryChart: some View {
        Chart(byCategory, id: \.category) { item in
            SectorMark(
                angle: .value("金額", NSDecimalNumber(decimal: item.total).doubleValue),
                innerRadius: .ratio(0.6),
                angularInset: 1.5
            )
            .foregroundStyle(by: .value("カテゴリ", item.category))
            .cornerRadius(4)
        }
        .frame(height: 220)
        .padding(.vertical, 8)
    }
}

struct TransactionRow: View {
    let tx: Transaction
    var body: some View {
        HStack {
            VStack(alignment: .leading, spacing: 2) {
                Text(tx.category).font(.subheadline.bold())
                if !tx.memo.isEmpty {
                    Text(tx.memo).font(.caption).foregroundStyle(.secondary)
                }
                Text(tx.date, format: .dateTime.month().day()).font(.caption2).foregroundStyle(.tertiary)
            }
            Spacer()
            Text((tx.kind == .expense ? "-" : "+") + tx.amount.yenString)
                .font(.callout.monospacedDigit().bold())
                .foregroundStyle(tx.kind == .expense ? .red : .green)
        }
    }
}

struct NewTransactionView: View {
    @Environment(\.dismiss) private var dismiss
    @Environment(\.modelContext) private var context
    @State private var kind: TransactionKind = .expense
    @State private var amount = ""
    @State private var category = Transaction.expenseCategories[0]
    @State private var memo = ""
    @State private var date = Date.now
    @FocusState private var amountFocused: Bool

    private var categories: [String] {
        kind == .expense ? Transaction.expenseCategories : Transaction.incomeCategories
    }

    var body: some View {
        NavigationStack {
            Form {
                Picker("種類", selection: $kind) {
                    Text("支出").tag(TransactionKind.expense)
                    Text("収入").tag(TransactionKind.income)
                }
                .pickerStyle(.segmented)
                .onChange(of: kind) { category = categories[0] }

                TextField("金額(円)", text: $amount)
                    .keyboardType(.numberPad)
                    .focused($amountFocused)
                Picker("カテゴリ", selection: $category) {
                    ForEach(categories, id: \.self) { Text($0) }
                }
                TextField("メモ", text: $memo)
                DatePicker("日付", selection: $date, displayedComponents: .date)
            }
            .navigationTitle("記録を追加")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .cancellationAction) { Button("キャンセル") { dismiss() } }
                ToolbarItem(placement: .confirmationAction) {
                    Button("保存") {
                        if let value = Decimal(string: amount) {
                            context.insert(Transaction(amount: value, kind: kind,
                                                       category: category, memo: memo, date: date))
                            Haptics.success()
                            dismiss()
                        }
                    }
                    .disabled(Decimal(string: amount) == nil)
                }
            }
            .onAppear { amountFocused = true }
        }
    }
}
