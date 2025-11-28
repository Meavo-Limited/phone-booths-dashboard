import { ClientsService, OrgUnitsService, PhoneBoothsService } from "@/client"
import {
    Checkmark,
    TreeView,
    createTreeCollection,
    useTreeViewNodeContext,
    Spinner,
    VStack,
    Text,
} from "@chakra-ui/react"
import { useQuery } from "@tanstack/react-query"
import { LuFile, LuFolder } from "react-icons/lu"

interface PhoneBoothTreeFilterProps {
    onCheckedChange?: (checkedItems: string[]) => void
}

function getClientsQuery() {
    return {
        queryKey: ["clients"],
        queryFn: () => ClientsService.readClients(),
    }
}

function getOrgUnitsQuery() {
    return {
        queryKey: ["orgUnits"],
        queryFn: () => OrgUnitsService.readOrgUnits(),
    }
}

function getPhoneBoothsQuery() {
    return {
        queryKey: ["phoneBooths"],
        queryFn: () => PhoneBoothsService.readPhoneBooths(),
    }
}

const TreeNodeCheckbox = (props: TreeView.NodeCheckboxProps) => {
    const nodeState = useTreeViewNodeContext()
    return (
        <TreeView.NodeCheckbox aria-label="check node" {...props}>
            <Checkmark
                bg={{
                    base: "bg",
                    _checked: "colorPalette.solid",
                    _indeterminate: "colorPalette.solid",
                }}
                size="sm"
                checked={nodeState.checked === true}
                indeterminate={nodeState.checked === "indeterminate"}
            />
        </TreeView.NodeCheckbox>
    )
}

interface Node {
    id: string
    name: string
    children?: Node[]
    type: "client" | "orgUnit" | "booth"
}

// 🧠 Utility: recursively sort nodes by name
function sortTree(node: Node): Node {
    if (node.children && node.children.length > 0) {
        node.children = node.children
            .sort((a, b) => a.name.localeCompare(b.name))
            .map(sortTree)
    }
    return node
}

// 🧩 Build hierarchy from clients, orgUnits, and booths
function buildTree(clients: any[], orgUnits: any[], booths: any[]): Node {
    const orgUnitMap = new Map<string, Node>()

    // Step 1. Create orgUnit nodes
    orgUnits.forEach((ou) => {
        orgUnitMap.set(ou.id, {
            id: ou.id,
            name: ou.name,
            children: [],
            type: "orgUnit",
        })
    })

    // Step 2. Link orgUnits under parents
    orgUnits.forEach((ou) => {
        const node = orgUnitMap.get(ou.id)!
        if (ou.parent_id) {
            const parent = orgUnitMap.get(ou.parent_id)
            if (parent) parent.children!.push(node)
        }
    })

    // Step 3. Create clients and attach top-level orgUnits
    const clientMap = new Map<string, Node>()
    clients.forEach((client) => {
        clientMap.set(client.id, {
            id: client.id,
            name: client.name,
            children: [],
            type: "client",
        })
    })

    orgUnits.forEach((ou) => {
        if (!ou.parent_id) {
            const clientNode = clientMap.get(ou.client_id)
            if (clientNode) clientNode.children!.push(orgUnitMap.get(ou.id)!)
        }
    })

    // Step 4. Attach booths to their orgUnit parents
    booths.forEach((booth) => {
        const parent = orgUnitMap.get(booth.org_unit_id)
        if (parent) {
            parent.children!.push({
                id: booth.id,
                name: `${booth.name} (${booth.serial_number})`,
                type: "booth",
            })
        }
    })

    // Step 5. Root with all clients
    const root: Node = {
        id: "ROOT",
        name: "",
        type: "client",
        children: Array.from(clientMap.values()),
    }

    // ✅ Step 6. Sort everything recursively
    return sortTree(root)
}

const PhoneBoothTreeFilter = ({ onCheckedChange }: PhoneBoothTreeFilterProps) => {
    const clientsQuery = useQuery(getClientsQuery())
    const orgUnitsQuery = useQuery(getOrgUnitsQuery())
    const boothsQuery = useQuery(getPhoneBoothsQuery())

    const isLoading =
        clientsQuery.isLoading || orgUnitsQuery.isLoading || boothsQuery.isLoading
    const hasError =
        clientsQuery.isError || orgUnitsQuery.isError || boothsQuery.isError

    if (isLoading) {
        return (
            <VStack>
                <Spinner />
                <Text>Loading hierarchy...</Text>
            </VStack>
        )
    }

    if (hasError) {
        return <Text color="red.500">Failed to load tree data.</Text>
    }

    const clients = clientsQuery.data || []
    const orgUnits = orgUnitsQuery.data || []
    const booths = boothsQuery.data || []

    const rootNode = buildTree(clients, orgUnits, booths)

    const collection = createTreeCollection<Node>({
        nodeToValue: (node) => node.id,
        nodeToString: (node) => node.name,
        rootNode,
    })

    const allIds = collection.getValues();

    return (
        <TreeView.Root
            collection={collection}
            maxW="sm"
            defaultCheckedValue={allIds}
            onCheckedChange={(details) => {
                console.log("Checked in TreeView:", details.checkedValue)
                onCheckedChange?.(details.checkedValue)
            }}
        >
            <TreeView.Label>Phone Booth Filter</TreeView.Label>
            <TreeView.Tree>
                <TreeView.Node
                    render={({ node, nodeState }) =>
                        nodeState.isBranch ? (
                            <TreeView.BranchControl role="none">
                                <TreeNodeCheckbox />
                                <LuFolder />
                                <TreeView.BranchText>{node.name}</TreeView.BranchText>
                            </TreeView.BranchControl>
                        ) : (
                            <TreeView.Item>
                                <TreeNodeCheckbox />
                                <LuFile />
                                <TreeView.ItemText>{node.name}</TreeView.ItemText>
                            </TreeView.Item>
                        )
                    }
                />
            </TreeView.Tree>
        </TreeView.Root>
    )
}

export default PhoneBoothTreeFilter
