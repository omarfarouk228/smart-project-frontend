"use client"

import * as React from "react"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"

function AlertDialog({ open, onOpenChange, children }: {
  open?: boolean
  onOpenChange?: (open: boolean) => void
  children: React.ReactNode
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      {children}
    </Dialog>
  )
}

function AlertDialogContent({ className, ...props }: React.ComponentProps<typeof DialogContent>) {
  return <DialogContent showCloseButton={false} className={cn("max-w-sm", className)} {...props} />
}

const AlertDialogHeader = DialogHeader
const AlertDialogTitle = DialogTitle
const AlertDialogDescription = DialogDescription

function AlertDialogFooter({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <DialogFooter
      className={cn("flex flex-row justify-end gap-2", className)}
      {...props}
    />
  )
}

function AlertDialogCancel({ className, onClick, children, ...props }: React.ComponentProps<typeof Button> & { onClick?: () => void }) {
  return (
    <Button
      variant="outline"
      className={cn("text-[13px] h-8", className)}
      onClick={onClick}
      {...props}
    >
      {children}
    </Button>
  )
}

function AlertDialogAction({ className, ...props }: React.ComponentProps<typeof Button>) {
  return (
    <Button
      className={cn("text-[13px] h-8", className)}
      {...props}
    />
  )
}

export {
  AlertDialog,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogCancel,
  AlertDialogAction,
}
