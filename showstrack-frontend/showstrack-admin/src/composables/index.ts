/**
 * Composables Index
 * Exports all composables for easy importing
 */

export { useShows } from './useShows'
export { useSettings } from './useSettings'
export { useNotifications } from './useNotifications'
export { useTable } from './useTable'
export { useModal, showConfirmationModal, showAlertModal, showFormModal } from './useModal'
export { useEventsView } from './useEventsView'
export { useFileUpload } from './useFileUpload'
export { useImportValidation } from './useImportValidation'

export type {
  UseShowsOptions,
  UseShowsReturn,
  BulkOperationResult
} from './useShows'

export type {
  UseSettingsOptions,
  UseSettingsReturn,
  FormData as SettingsFormData,
  ValidationResult,
  ValidationError,
  ChangeTracker
} from './useSettings'

export type {
  ToastType,
  Toast,
  UseNotificationsReturn
} from './useNotifications'

export type {
  UseTableOptions,
  UseTableReturn,
  TableColumn,
  SortOptions,
  FilterOptions,
  ExportOptions,
  PaginationState
} from './useTable'

export type {
  UseModalOptions,
  UseModalReturn,
  ModalConfig,
  ModalInstance,
  ModalSize,
  ModalVariant,
  ModalPosition
} from './useModal'
