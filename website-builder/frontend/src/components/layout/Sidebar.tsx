import { Link, useLocation } from 'react-router-dom'
import { 
  Home, 
  FolderOpen, 
  Wand2, 
  Settings, 
  BarChart3,
  FileText,
  Image,
  Palette
} from 'lucide-react'
import { cn } from '@/utils'

const navigation = [
  {
    name: 'Dashboard',
    href: '/',
    icon: Home,
  },
  {
    name: 'Projects',
    href: '/projects',
    icon: FolderOpen,
  },
  {
    name: 'Create Website',
    href: '/wizard',
    icon: Wand2,
  },
  {
    name: 'Templates',
    href: '/templates',
    icon: FileText,
  },
  {
    name: 'Assets',
    href: '/assets',
    icon: Image,
  },
  {
    name: 'Themes',
    href: '/themes',
    icon: Palette,
  },
  {
    name: 'Analytics',
    href: '/analytics',
    icon: BarChart3,
  },
  {
    name: 'Settings',
    href: '/settings',
    icon: Settings,
  },
]

export const Sidebar = () => {
  const location = useLocation()

  return (
    <aside className="fixed inset-y-0 left-0 z-50 w-64 bg-white dark:bg-gray-800 border-r border-gray-200 dark:border-gray-700 pt-16">
      <nav className="flex flex-col h-full p-4">
        <div className="space-y-2 flex-1">
          {navigation.map((item) => {
            const isActive = location.pathname === item.href
            return (
              <Link
                key={item.name}
                to={item.href}
                className={cn(
                  'flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors',
                  isActive
                    ? 'bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400'
                    : 'text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 hover:text-gray-900 dark:hover:text-white'
                )}
              >
                <item.icon className="h-5 w-5" />
                {item.name}
              </Link>
            )
          })}
        </div>

        {/* Bottom section */}
        <div className="pt-4 border-t border-gray-200 dark:border-gray-700">
          <div className="text-xs text-gray-500 dark:text-gray-400 px-3 py-2">
            © 2025 Website Builder
          </div>
        </div>
      </nav>
    </aside>
  )
}
