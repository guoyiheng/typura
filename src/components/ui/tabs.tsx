import { cn } from '@/utils/ui'
import * as TabsPrimitive from '@radix-ui/react-tabs'
import * as React from 'react'

const Tabs = TabsPrimitive.Root

const TabsContent = React.forwardRef<
  React.ElementRef<typeof TabsPrimitive.Content>,
  React.ComponentPropsWithoutRef<typeof TabsPrimitive.Content>
>(({ className, ...props }, ref) => <TabsPrimitive.Content ref={ref} className={cn('mt-2 focus:outline-none', className)} {...props} />)
TabsContent.displayName = TabsPrimitive.Content.displayName

export { Tabs, TabsContent }
