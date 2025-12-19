import { Box, Flex, Icon, Text } from "@chakra-ui/react"
import { useQueryClient } from "@tanstack/react-query"
import { Link as RouterLink } from "@tanstack/react-router"
import { FiBriefcase, FiHome, FiSettings, FiUsers, FiCalendar, FiBarChart2, FiList, FiGrid, FiFile } from "react-icons/fi"
import type { IconType } from "react-icons/lib"
import type { UserPublic } from "@/client"
import { useState } from "react"
import { FiChevronDown, FiChevronRight } from "react-icons/fi"

const items = [
  { icon: FiHome, title: "Dashboard", path: "/" },
  // { icon: FiBriefcase, title: "Items", path: "/items" },
  // { icon: FiBriefcase, title: "MQTT Items", path: "/mqtt-items" },
  { icon: FiCalendar, title: "Booth Calendar", path: "/booth-calendar" },
  { icon: FiSettings, title: "Phone Booths", path: "/phone-booths" },
  { icon: FiSettings, title: "User Settings", path: "/settings" },
]

interface SidebarItemsProps {
  onClose?: () => void
}

interface Item {
  icon: IconType
  title: string
  path?: string
  submenu?: { icon: IconType; title: string; path: string }[]
}

const SidebarItems = ({ onClose }: SidebarItemsProps) => {
  const queryClient = useQueryClient()
  const currentUser = queryClient.getQueryData<UserPublic>(["currentUser"])
  const [expandedItems, setExpandedItems] = useState<string[]>(["Usage Reports"])

  const usageReportsItem: Item = {
    icon: FiBriefcase,
    title: "Usage Reports",
    submenu: [
      { icon: FiBarChart2, title: "Charts", path: "/usage-reports/charts" },
      { icon: FiList, title: "Summary Table", path: "/usage-reports/table" },
    ],
  }

  const allItems: Item[] = [
    ...items.slice(0, 4),
    usageReportsItem,
    ...items.slice(4),
  ]

  const finalItems: Item[] = currentUser?.is_superuser
    ? [
        ...allItems,
        {
          icon: FiUsers,
          title: "Admin",
          submenu: [
            { icon: FiUsers, title: "Users", path: "/admin/admin" },
            { icon: FiBriefcase, title: "Clients", path: "/admin/clients" },
            { icon: FiGrid, title: "Organization Units", path: "/admin/org-units" },
            { icon: FiFile, title: "Import from CSV", path: "/admin/import-from-csv" },
          ],
        },
      ]
    : allItems

  const toggleExpand = (title: string) => {
    setExpandedItems((prev) =>
      prev.includes(title)
        ? prev.filter((item) => item !== title)
        : [...prev, title]
    )
  }

  const listItems = finalItems.map(({ icon, title, path, submenu }) => {
    const isExpanded = expandedItems.includes(title)

    if (submenu) {
      return (
        <Box key={title}>
          <Flex
            gap={4}
            px={4}
            py={2}
            _hover={{
              background: "gray.subtle",
              cursor: "pointer",
            }}
            alignItems="center"
            fontSize="sm"
            onClick={() => toggleExpand(title)}
          >
            <Icon as={icon} alignSelf="center" />
            <Text ml={2} flex="1">{title}</Text>
            <Icon as={isExpanded ? FiChevronDown : FiChevronRight} />
          </Flex>
          {isExpanded && (
            <Box pl={8}>
              {submenu.map((subItem) => (
                <RouterLink key={subItem.title} to={subItem.path} onClick={onClose}>
                  <Flex
                    gap={4}
                    px={4}
                    py={2}
                    _hover={{
                      background: "gray.subtle",
                    }}
                    alignItems="center"
                    fontSize="sm"
                  >
                    <Icon as={subItem.icon} alignSelf="center" />
                    <Text ml={2}>{subItem.title}</Text>
                  </Flex>
                </RouterLink>
              ))}
            </Box>
          )}
        </Box>
      )
    }

    return (
      <RouterLink key={title} to={path!} onClick={onClose}>
        <Flex
          gap={4}
          px={4}
          py={2}
          _hover={{
            background: "gray.subtle",
          }}
          alignItems="center"
          fontSize="sm"
        >
          <Icon as={icon} alignSelf="center" />
          <Text ml={2}>{title}</Text>
        </Flex>
      </RouterLink>
    )
  })

  return (
    <>
      <Text fontSize="xs" px={4} py={2} fontWeight="bold">
        Menu
      </Text>
      <Box>{listItems}</Box>
    </>
  )
}

export default SidebarItems
