import { Building2, CalendarCheck, FileCheck2, FileText, FolderLock, ShieldCheck } from 'lucide-react';
import type { ServiceItem } from '../../types';

export const serviceIcons: Record<ServiceItem['iconName'], typeof Building2> = {
  Building2,
  ShieldCheck,
  FileText,
  FileCheck2,
  CalendarCheck,
  FolderLock,
};
