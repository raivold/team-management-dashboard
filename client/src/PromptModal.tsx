import { useEffect, useState } from 'react';
import { Input, Modal } from 'antd';

// Small prompt dialog: antd Modal + Input, replacing window.prompt so the
// dialog follows the app theme and locale instead of the browser chrome.
// An empty value keeps the OK button disabled (the old prompt returned
// early on an empty name for the same reason). With `password`, the
// input is a password field (used for the admin password reset).
export default function PromptModal({ open, title, label, initialValue = '', password = false, onOk, onCancel }: {
  open: boolean; title: string; label: string; initialValue?: string; password?: boolean;
  onOk: (value: string) => void; onCancel: () => void;
}) {
  const [value, setValue] = useState(initialValue);
  useEffect(() => { if (open) setValue(initialValue); }, [open, initialValue]);
  const submit = () => { const v = value.trim(); if (v) onOk(v); };
  return (
    <Modal open={open} title={title} onCancel={onCancel} onOk={submit}
      okButtonProps={{ disabled: !value.trim() }} destroyOnClose>
      <label htmlFor="prompt-input" style={{ display: 'block', marginBottom: 6, fontWeight: 600 }}>{label}</label>
      {password
        ? <Input.Password id="prompt-input" autoFocus value={value} onChange={(e) => setValue(e.target.value)} onPressEnter={submit} />
        : <Input id="prompt-input" autoFocus value={value} onChange={(e) => setValue(e.target.value)} onPressEnter={submit} />}
    </Modal>
  );
}
