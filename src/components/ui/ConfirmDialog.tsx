import { useState } from 'react'
import { Modal } from './Modal'
import { Button } from './Button'

interface ConfirmDialogProps {
  open: boolean
  onClose: () => void
  onConfirm: () => Promise<void> | void
  title: string
  description?: string
  confirmLabel?: string
  cancelLabel?: string
  tone?: 'danger' | 'solid'
  icon?: React.ReactNode
  children?: React.ReactNode
}

export function ConfirmDialog({
  open,
  onClose,
  onConfirm,
  title,
  description,
  confirmLabel = 'Confirm',
  cancelLabel = 'Cancel',
  tone = 'solid',
  icon,
  children,
}: ConfirmDialogProps) {
  const [loading, setLoading] = useState(false)

  async function handleConfirm() {
    setLoading(true)
    try {
      await onConfirm()
    } finally {
      setLoading(false)
    }
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={title}
      description={description}
      size="sm"
      icon={icon}
      footer={
        <>
          <Button variant="quiet" onClick={onClose} disabled={loading}>
            {cancelLabel}
          </Button>
          <Button variant={tone === 'danger' ? 'danger' : 'solid'} onClick={handleConfirm} loading={loading}>
            {confirmLabel}
          </Button>
        </>
      }
    >
      {children}
    </Modal>
  )
}
