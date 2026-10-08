'use client'

import { createToastManager } from '@base-ui/react/toast'

export const appToastManager = createToastManager()

type ToastKind = 'info' | 'success' | 'error'

function pushToast(type: ToastKind, title: string, description?: string) {
  return appToastManager.add({
    title,
    description,
    type,
    timeout: type === 'error' ? 6500 : 4500,
    priority: type === 'error' ? 'high' : 'low',
  })
}

export const appToast = {
  info: (title: string, description?: string) => pushToast('info', title, description),
  success: (title: string, description?: string) => pushToast('success', title, description),
  error: (title: string, description?: string) => pushToast('error', title, description),
}

export type AppToast = typeof appToast

export function dismissAppToast(id: string) {
  appToastManager.close(id)
}

export function dismissAllAppToasts() {
  appToastManager.close()
}

export function addAppToast(type: ToastKind, title: string, description?: string) {
  return pushToast(type, title, description)
}

export type AppToastType = ToastKind

export function updateAppToast(id: string, type: ToastKind, title: string, description?: string) {
  appToastManager.update(id, { type, title, description })
}

export function promiseAppToast<Value>(
  promise: Promise<Value>,
  options: {
    loading: string
    success: string | ((value: Value) => string)
    error: string | ((error: unknown) => string)
  },
) {
  return appToastManager.promise(promise, options)
}

export function clearAppToasts() {
  dismissAllAppToasts()
}

export const showAppToast = appToast.info
export const showAppToastSuccess = appToast.success
export const showAppToastError = appToast.error

export function useAppToast() {
  return appToast
}

export function resetAppToastManager() {
  dismissAllAppToasts()
}

export const notify = appToast

export const appToasts = appToast

export function toastInfo(title: string, description?: string) {
  return appToast.info(title, description)
}

export function toastError(title: string, description?: string) {
  return appToast.error(title, description)
}

export function toastSuccess(title: string, description?: string) {
  return appToast.success(title, description)
}

export function isToastManagerReady() {
  return typeof appToastManager.add === 'function'
}

export function createToast(type: ToastKind, title: string, description?: string) {
  return pushToast(type, title, description)
}

export function closeToast(id?: string) {
  appToastManager.close(id)
}

export function addToast(type: ToastKind, title: string, description?: string) {
  return pushToast(type, title, description)
}

export const toast = appToast

export default appToast

export function getToastManager() {
  return appToastManager
}

export function setToast(type: ToastKind, title: string, description?: string) {
  return pushToast(type, title, description)
}

export function showToast(type: ToastKind, title: string, description?: string) {
  return pushToast(type, title, description)
}

export function toastMessage(title: string, description?: string) {
  return appToast.info(title, description)
}

export function toastWarning(title: string, description?: string) {
  return appToast.info(title, description)
}

export function toastNotice(title: string, description?: string) {
  return appToast.info(title, description)
}

export function toastSuccess(title: string, description?: string) {
  return appToast.success(title, description)
}

export function toastFailure(title: string, description?: string) {
  return appToast.error(title, description)
}

export function showToastInfo(title: string, description?: string) {
  return appToast.info(title, description)
}

export function showToastError(title: string, description?: string) {
  return appToast.error(title, description)
}

export function showToastSuccess(title: string, description?: string) {
  return appToast.success(title, description)
}

export function notifyInfo(title: string, description?: string) {
  return appToast.info(title, description)
}

export function notifyError(title: string, description?: string) {
  return appToast.error(title, description)
}

export function notifySuccess(title: string, description?: string) {
  return appToast.success(title, description)
}
