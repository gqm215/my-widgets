
import { loadState, importState, resetState } from '@/utils/storage';
import { useAppStore } from '@/store';
import { useState } from 'react';
import { Sun, Moon, Upload, Download, AlertCircle, CheckCircle2, Trash2, Tag, Pencil, Plus, X } from 'lucide-react';
import { useTheme } from '@/hooks/useTheme';
import { ConfirmDialog, Input } from '@/components/ui';
import { cn } from '@/lib/utils';

const TAG_COLORS = [
  '#c94043', // 朱砂
  '#d4a84b', // 藤黄
  '#5a9e89', // 青碧
  '#4a7fb5', // 靛蓝
  '#8b6baa', // 紫苑
  '#2d9d8e', // 翠微
  '#e07b5a', // 赭石
  '#d4698b', // 胭脂
  '#6b7d8a', // 岩灰
  '#8a8a8a', // 墨灰
];

export default function Settings() {
  const [dataExported, setDataExported] = useState(false);
  const [importStatus, setImportStatus] = useState<{ type: 'success' | 'error'; message: string } | null>(null);
  const [resetDialogOpen, setResetDialogOpen] = useState(false);
  const { toggleTheme, isDark } = useTheme();
  const replaceAll = useAppStore((s) => s.replaceAll);

  // 标签管理
  const tags = useAppStore((s) => s.tags);
  const notes = useAppStore((s) => s.notes);
  const addTag = useAppStore((s) => s.addTag);
  const updateTag = useAppStore((s) => s.updateTag);
  const deleteTag = useAppStore((s) => s.deleteTag);

  const [editingTagId, setEditingTagId] = useState<string | null>(null);
  const [editName, setEditName] = useState('');
  const [editColor, setEditColor] = useState('');
  const [showNewTag, setShowNewTag] = useState(false);
  const [newName, setNewName] = useState('');
  const [newColor, setNewColor] = useState(TAG_COLORS[0]);
  const [deleteTagTarget, setDeleteTagTarget] = useState<string | null>(null);

  const handleExportData = () => {
    const data = loadState();
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `moji-backup-${new Date().toISOString().split('T')[0]}.json`;
    a.click();
    URL.revokeObjectURL(url);
    setDataExported(true);
    setTimeout(() => setDataExported(false), 3000);
  };

  const handleImportData = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      const result = importState(reader.result as string);
      if (result.ok) {
        replaceAll(result.data);
        setImportStatus({ type: 'success', message: '数据导入成功！' });
      } else {
        setImportStatus({ type: 'error', message: (result as { ok: false; error: string }).error });
      }
      setTimeout(() => setImportStatus(null), 4000);
    };
    reader.onerror = () => {
      setImportStatus({ type: 'error', message: '文件读取失败' });
      setTimeout(() => setImportStatus(null), 4000);
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  const handleResetData = () => {
    const data = resetState();
    replaceAll(data);
    setResetDialogOpen(false);
    setImportStatus({ type: 'success', message: '数据已重置为初始状态' });
    setTimeout(() => setImportStatus(null), 4000);
  };

  // 标签操作
  const handleStartEdit = (tagId: string) => {
    const tag = tags.find((t) => t.id === tagId);
    if (!tag) return;
    setEditingTagId(tagId);
    setEditName(tag.name);
    setEditColor(tag.color);
  };

  const handleCancelEdit = () => {
    setEditingTagId(null);
    setEditName('');
    setEditColor('');
  };

  const handleSaveEdit = (tagId: string) => {
    const trimmed = editName.trim();
    if (!trimmed) return;
    // 检查名称是否与其他标签重复
    const duplicate = tags.find((t) => t.id !== tagId && t.name === trimmed);
    if (duplicate) {
      setImportStatus({ type: 'error', message: `标签名称「${trimmed}」已存在` });
      setTimeout(() => setImportStatus(null), 4000);
      return;
    }
    updateTag(tagId, { name: trimmed, color: editColor });
    setEditingTagId(null);
  };

  const handleCreateTag = () => {
    const trimmed = newName.trim();
    if (!trimmed) return;
    const duplicate = tags.find((t) => t.name === trimmed);
    if (duplicate) {
      setImportStatus({ type: 'error', message: `标签名称「${trimmed}」已存在` });
      setTimeout(() => setImportStatus(null), 4000);
      return;
    }
    addTag({ name: trimmed, color: newColor });
    setNewName('');
    setNewColor(TAG_COLORS[0]);
    setShowNewTag(false);
  };

  const handleRequestDelete = (tagId: string) => {
    setDeleteTagTarget(tagId);
  };

  const handleConfirmDelete = () => {
    if (!deleteTagTarget) return;
    const tag = tags.find((t) => t.id === deleteTagTarget);
    if (tag) {
      // 检查该标签是否被笔记使用
      const usedInNotes = notes.filter((n) => n.tags.includes(tag.name));
      if (usedInNotes.length > 0) {
        // 清理笔记中的该标签
        usedInNotes.forEach((n) => {
          const appStore = useAppStore.getState();
          appStore.updateNote(n.id, {
            tags: n.tags.filter((t) => t !== tag.name),
          });
        });
      }
    }
    deleteTag(deleteTagTarget);
    setDeleteTagTarget(null);
  };

  // 获取标签被使用计数
  const getTagUsageCount = (tagName: string) => {
    return notes.filter((n) => n.tags.includes(tagName)).length;
  };

  // 获取删除确认信息
  const deleteTagInfo = (() => {
    if (!deleteTagTarget) return null;
    const tag = tags.find((t) => t.id === deleteTagTarget);
    if (!tag) return null;
    const count = getTagUsageCount(tag.name);
    return { tag, count };
  })();

  return (
    <div className="p-8 max-w-2xl mx-auto">
      <h2 className="text-2xl font-serif font-semibold text-ink-900 dark:text-ink-100 mb-8">设置</h2>

      <div className="space-y-6">
        {/* 主题切换 */}
        <div className="bg-white dark:bg-ink-800 rounded-lg shadow-paper dark:shadow-none p-6">
          <h3 className="font-medium text-ink-900 dark:text-ink-100 mb-3">外观</h3>
          <p className="text-ink-500 dark:text-ink-400 text-sm mb-4">
            选择您偏好的外观模式。
          </p>
          <div className="flex items-center gap-2">
            <button
              onClick={toggleTheme}
              className="flex items-center gap-2 px-4 py-2 rounded-md border border-paper-dark dark:border-ink-600 hover:bg-paper-dark dark:hover:bg-ink-700 transition-colors text-ink-700 dark:text-ink-200"
            >
              {isDark ? (
                <>
                  <Sun className="w-4 h-4" strokeWidth={1.5} />
                  <span>切换到浅色模式</span>
                </>
              ) : (
                <>
                  <Moon className="w-4 h-4" strokeWidth={1.5} />
                  <span>切换到深色模式</span>
                </>
              )}
            </button>
          </div>
        </div>

        {/* 标签管理 */}
        <div className="bg-white dark:bg-ink-800 rounded-lg shadow-paper dark:shadow-none p-6">
          <h3 className="font-medium text-ink-900 dark:text-ink-100 mb-3">标签管理</h3>
          <p className="text-ink-500 dark:text-ink-400 text-sm mb-4">
            管理笔记标签，创建、编辑或删除标签。
          </p>

          {/* 标签列表 */}
          {tags.length === 0 ? (
            <p className="text-ink-400 dark:text-ink-300 text-sm py-2 text-center">
              暂无标签，点击下方按钮创建
            </p>
          ) : (
            <div className="space-y-2 mb-4">
              {tags.map((tag) => {
                const isEditing = editingTagId === tag.id;
                const usageCount = getTagUsageCount(tag.name);
                return (
                  <div
                    key={tag.id}
                    className={cn(
                      'flex items-center gap-3 px-3 py-2 rounded-lg transition-colors',
                      'border border-paper-dark dark:border-ink-600',
                      isEditing
                        ? 'bg-paper-accent dark:bg-ink-700/50'
                        : 'hover:bg-paper-accent dark:hover:bg-ink-700/30'
                    )}
                  >
                    {/* 颜色标识 */}
                    {isEditing ? (
                      <div className="flex items-center gap-1.5 flex-shrink-0">
                        {TAG_COLORS.map((c) => (
                          <button
                            key={c}
                            onClick={() => setEditColor(c)}
                            className={cn(
                              'w-5 h-5 rounded-full border-2 transition-all',
                              editColor === c
                                ? 'border-ink-900 dark:border-paper scale-110 shadow-md'
                                : 'border-transparent hover:scale-105'
                            )}
                            style={{ backgroundColor: c }}
                            title={c}
                          />
                        ))}
                      </div>
                    ) : (
                      <span
                        className="w-3.5 h-3.5 rounded-full flex-shrink-0"
                        style={{ backgroundColor: tag.color }}
                      />
                    )}

                    {/* 名称 */}
                    {isEditing ? (
                      <Input
                        type="text"
                        value={editName}
                        onChange={(e) => setEditName(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') handleSaveEdit(tag.id);
                          if (e.key === 'Escape') handleCancelEdit();
                        }}
                        className="flex-1 text-sm"
                        placeholder="标签名称"
                        autoFocus
                      />
                    ) : (
                      <span className="flex-1 text-sm text-ink-700 dark:text-ink-200 font-medium">
                        {tag.name}
                        {usageCount > 0 && (
                          <span className="ml-2 text-xs text-ink-400 dark:text-ink-400">
                            ({usageCount} 篇笔记)
                          </span>
                        )}
                      </span>
                    )}

                    {/* 操作按钮 */}
                    <div className="flex items-center gap-1 flex-shrink-0">
                      {isEditing ? (
                        <>
                          <button
                            onClick={() => handleSaveEdit(tag.id)}
                            disabled={!editName.trim()}
                            className="p-1.5 text-xs text-success hover:bg-success/10 rounded transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
                          >
                            保存
                          </button>
                          <button
                            onClick={handleCancelEdit}
                            className="p-1.5 hover:bg-paper-dark dark:hover:bg-ink-600 rounded transition-colors text-ink-400 dark:text-ink-300"
                          >
                            <X className="w-4 h-4" strokeWidth={1.5} />
                          </button>
                        </>
                      ) : (
                        <>
                          <button
                            onClick={() => handleStartEdit(tag.id)}
                            className="p-1.5 hover:bg-paper-dark dark:hover:bg-ink-600 rounded transition-colors text-ink-400 dark:text-ink-300 hover:text-ink-700 dark:hover:text-ink-100"
                          >
                            <Pencil className="w-4 h-4" strokeWidth={1.5} />
                          </button>
                          <button
                            onClick={() => handleRequestDelete(tag.id)}
                            className="p-1.5 hover:bg-vermilion/10 rounded transition-colors text-ink-400 dark:text-ink-300 hover:text-vermilion"
                          >
                            <Trash2 className="w-4 h-4" strokeWidth={1.5} />
                          </button>
                        </>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* 新建标签 */}
          {showNewTag ? (
            <div className="flex items-center gap-3 px-3 py-2 rounded-lg border border-rattan/40 dark:border-rattan/30 bg-paper-accent dark:bg-ink-700/50">
              <div className="flex items-center gap-1.5 flex-shrink-0">
                {TAG_COLORS.map((c) => (
                  <button
                    key={c}
                    onClick={() => setNewColor(c)}
                    className={cn(
                      'w-5 h-5 rounded-full border-2 transition-all',
                      newColor === c
                        ? 'border-ink-900 dark:border-paper scale-110 shadow-md'
                        : 'border-transparent hover:scale-105'
                    )}
                    style={{ backgroundColor: c }}
                    title={c}
                  />
                ))}
              </div>
              <Input
                type="text"
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') handleCreateTag();
                  if (e.key === 'Escape') {
                    setShowNewTag(false);
                    setNewName('');
                  }
                }}
                className="flex-1 text-sm"
                placeholder="输入标签名称"
                autoFocus
              />
              <button
                onClick={handleCreateTag}
                disabled={!newName.trim()}
                className="p-1.5 text-xs text-rattan hover:bg-rattan/10 rounded transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
              >
                创建
              </button>
              <button
                onClick={() => {
                  setShowNewTag(false);
                  setNewName('');
                }}
                className="p-1.5 hover:bg-paper-dark dark:hover:bg-ink-600 rounded transition-colors text-ink-400 dark:text-ink-300"
              >
                <X className="w-4 h-4" strokeWidth={1.5} />
              </button>
            </div>
          ) : (
            <button
              onClick={() => setShowNewTag(true)}
              className="flex items-center gap-2 text-sm text-ink-500 dark:text-ink-400 hover:text-rattan dark:hover:text-rattan transition-colors"
            >
              <Plus className="w-4 h-4" strokeWidth={1.5} />
              新建标签
            </button>
          )}
        </div>

        <div className="bg-white dark:bg-ink-800 rounded-lg shadow-paper dark:shadow-none p-6">
          <h3 className="font-medium text-ink-900 dark:text-ink-100 mb-3">数据管理</h3>
          <p className="text-ink-500 dark:text-ink-400 text-sm mb-4">
            导出您的所有数据进行备份，或从备份文件恢复数据。
          </p>
          <div className="flex flex-wrap gap-3">
            <button
              onClick={handleExportData}
              className="flex items-center gap-2 bg-ink-900 hover:bg-ink-700 text-white px-4 py-2 rounded-md transition-colors duration-200"
            >
              <Download className="w-4 h-4" strokeWidth={1.5} />
              {dataExported ? '已导出' : '导出数据'}
            </button>
            <label className="flex items-center gap-2 bg-ink-900 hover:bg-ink-700 text-white px-4 py-2 rounded-md transition-colors duration-200 cursor-pointer">
              <Upload className="w-4 h-4" strokeWidth={1.5} />
              导入数据
              <input
                type="file"
                accept=".json"
                onChange={handleImportData}
                className="hidden"
              />
            </label>
            <button
              onClick={() => setResetDialogOpen(true)}
              className="flex items-center gap-2 border border-vermilion text-vermilion hover:bg-vermilion/10 px-4 py-2 rounded-md transition-colors duration-200"
            >
              <Trash2 className="w-4 h-4" strokeWidth={1.5} />
              重置数据
            </button>
          </div>
        </div>

        <div className="bg-white dark:bg-ink-800 rounded-lg shadow-paper dark:shadow-none p-6">
          <h3 className="font-medium text-ink-900 dark:text-ink-100 mb-3">关于</h3>
          <p className="text-ink-500 dark:text-ink-400 text-sm">
            <span className="font-serif text-ink-900 dark:text-ink-100">墨集</span> — 墨色纸韵，一站式日程管理工具。
          </p>
        </div>
      </div>

      {/* Import status toast */}
      {importStatus && (
        <div
          className={`fixed bottom-6 right-6 z-50 flex items-center gap-2 px-4 py-3 rounded-lg shadow-paper-lg dark:shadow-none text-sm font-medium transition-all duration-300 ${
            importStatus.type === 'success'
              ? 'bg-success text-white'
              : 'bg-vermilion text-white'
          }`}
        >
          {importStatus.type === 'success' ? (
            <CheckCircle2 className="w-4 h-4" strokeWidth={1.5} />
          ) : (
            <AlertCircle className="w-4 h-4" strokeWidth={1.5} />
          )}
          {importStatus.message}
        </div>
      )}

      {/* 重置数据确认 */}
      <ConfirmDialog
        open={resetDialogOpen}
        onClose={() => setResetDialogOpen(false)}
        onConfirm={handleResetData}
        title="重置数据"
        message="确定要重置所有数据吗？此操作将清除所有笔记、备忘、待办和日程，并恢复为初始状态。此操作不可撤销。"
        confirmLabel="重置"
        variant="danger"
      />

      {/* 删除标签确认 */}
      <ConfirmDialog
        open={deleteTagTarget !== null}
        onClose={() => setDeleteTagTarget(null)}
        onConfirm={handleConfirmDelete}
        title="删除标签"
        message={
          deleteTagInfo
            ? deleteTagInfo.count > 0
              ? `确定要删除标签「${deleteTagInfo.tag.name}」吗？该标签当前被 ${deleteTagInfo.count} 篇笔记使用，删除后将从这些笔记中移除。`
              : `确定要删除标签「${deleteTagInfo.tag.name}」吗？此操作不可撤销。`
            : '确定要删除该标签吗？'
        }
        confirmLabel="删除"
        variant="danger"
      />
    </div>
  );
}

