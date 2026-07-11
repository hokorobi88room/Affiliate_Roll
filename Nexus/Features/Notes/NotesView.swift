import SwiftUI
import SwiftData

struct NotesView: View {
    @Environment(\.modelContext) private var context
    @Query(sort: \Note.updatedAt, order: .reverse) private var notes: [Note]
    @State private var search = ""
    @State private var newNote: Note?

    private var filtered: [Note] {
        let base = search.isEmpty ? notes : notes.filter {
            $0.title.localizedCaseInsensitiveContains(search) ||
            $0.body.localizedCaseInsensitiveContains(search)
        }
        return base.sorted { ($0.isPinned ? 0 : 1, $1.updatedAt) < ($1.isPinned ? 0 : 1, $0.updatedAt) }
    }

    var body: some View {
        List {
            ForEach(filtered) { note in
                NavigationLink {
                    NoteEditorView(note: note)
                } label: {
                    VStack(alignment: .leading, spacing: 4) {
                        HStack {
                            if note.isPinned { Image(systemName: "pin.fill").font(.caption).foregroundStyle(.orange) }
                            Text(note.title.isEmpty ? "無題" : note.title).font(.headline).lineLimit(1)
                        }
                        Text(note.body).font(.subheadline).foregroundStyle(.secondary).lineLimit(2)
                        Text(note.updatedAt, format: .relative(presentation: .named))
                            .font(.caption2).foregroundStyle(.tertiary)
                    }
                }
                .swipeActions(edge: .leading) {
                    Button { note.isPinned.toggle() } label: {
                        Label("ピン", systemImage: note.isPinned ? "pin.slash" : "pin")
                    }.tint(.orange)
                }
                .swipeActions(edge: .trailing) {
                    Button(role: .destructive) { context.delete(note) } label: {
                        Label("削除", systemImage: "trash")
                    }
                }
            }
        }
        .searchable(text: $search, prompt: "ノートを検索")
        .navigationTitle("ノート")
        .toolbar {
            Button {
                let note = Note()
                context.insert(note)
                newNote = note
            } label: { Image(systemName: "square.and.pencil") }
        }
        .navigationDestination(item: $newNote) { NoteEditorView(note: $0) }
        .overlay {
            if notes.isEmpty {
                ContentUnavailableView("ノートがありません", systemImage: "note.text")
            }
        }
    }
}

struct NoteEditorView: View {
    @Bindable var note: Note
    @State private var preview = false

    var body: some View {
        VStack(spacing: 0) {
            TextField("タイトル", text: $note.title)
                .font(.title2.bold())
                .padding(.horizontal)
                .padding(.top, 8)
            Divider().padding(.vertical, 8)
            if preview {
                ScrollView {
                    Text(markdown)
                        .frame(maxWidth: .infinity, alignment: .leading)
                        .padding(.horizontal)
                }
            } else {
                TextEditor(text: $note.body)
                    .padding(.horizontal, 12)
                    .scrollContentBackground(.hidden)
            }
        }
        .navigationBarTitleDisplayMode(.inline)
        .toolbar {
            Toggle(isOn: $preview) {
                Image(systemName: preview ? "pencil" : "eye")
            }
            .toggleStyle(.button)
            ShareLink(item: "\(note.title)\n\n\(note.body)")
        }
        .onChange(of: note.body) { note.updatedAt = .now }
        .onChange(of: note.title) { note.updatedAt = .now }
    }

    private var markdown: AttributedString {
        (try? AttributedString(markdown: note.body,
            options: .init(interpretedSyntax: .inlineOnlyPreservingWhitespace)))
        ?? AttributedString(note.body)
    }
}
