"use client"

import * as React from "react"
import * as SelectPrimitive from "@radix-ui/react-select"
import { Check, ChevronDown, ChevronUp, Search } from "lucide-react"

import { cn } from "@/lib/utils"

/** Texto plano de un nodo React (permite buscar por el nombre que se muestra). */
const textoNodo = (nodo) => {
  if (nodo == null || typeof nodo === "boolean") return ""
  if (typeof nodo === "string" || typeof nodo === "number") return String(nodo)
  if (Array.isArray(nodo)) return nodo.map(textoNodo).join(" ")
  if (React.isValidElement(nodo)) return textoNodo(nodo.props?.children)
  return ""
}

const normalizar = (texto) =>
  String(texto || "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")

/** Etiquetas de las opciones que contiene el desplegable (para saber cuántas hay). */
const etiquetasOpciones = (nodo, salida = []) => {
  if (nodo == null || typeof nodo === "boolean") return salida
  if (Array.isArray(nodo)) {
    nodo.forEach((n) => etiquetasOpciones(n, salida))
    return salida
  }
  if (React.isValidElement(nodo)) {
    if (nodo.props?.value !== undefined) {
      const texto = textoNodo(nodo.props.children)
      if (texto) salida.push(texto)
    } else {
      etiquetasOpciones(nodo.props?.children, salida)
    }
  }
  return salida
}

const SeleccionCtx = React.createContext(undefined)
const BusquedaCtx = React.createContext("")

const Select = ({ value, ...props }) => (
  <SeleccionCtx.Provider value={value}>
    <SelectPrimitive.Root value={value} {...props} />
  </SeleccionCtx.Provider>
)

const SelectGroup = SelectPrimitive.Group

const SelectValue = SelectPrimitive.Value

const SelectTrigger = React.forwardRef(({ className, children, ...props }, ref) => (
  <SelectPrimitive.Trigger
    ref={ref}
    className={cn(
      "flex h-9 w-full items-center justify-between whitespace-nowrap rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm ring-offset-background data-[placeholder]:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring disabled:cursor-not-allowed disabled:opacity-50 [&>span]:line-clamp-1",
      className
    )}
    {...props}>
    {children}
    <SelectPrimitive.Icon asChild>
      <ChevronDown className="h-4 w-4 opacity-50" />
    </SelectPrimitive.Icon>
  </SelectPrimitive.Trigger>
))
SelectTrigger.displayName = SelectPrimitive.Trigger.displayName

const SelectScrollUpButton = React.forwardRef(({ className, ...props }, ref) => (
  <SelectPrimitive.ScrollUpButton
    ref={ref}
    className={cn("flex cursor-default items-center justify-center py-1", className)}
    {...props}>
    <ChevronUp className="h-4 w-4" />
  </SelectPrimitive.ScrollUpButton>
))
SelectScrollUpButton.displayName = SelectPrimitive.ScrollUpButton.displayName

const SelectScrollDownButton = React.forwardRef(({ className, ...props }, ref) => (
  <SelectPrimitive.ScrollDownButton
    ref={ref}
    className={cn("flex cursor-default items-center justify-center py-1", className)}
    {...props}>
    <ChevronDown className="h-4 w-4" />
  </SelectPrimitive.ScrollDownButton>
))
SelectScrollDownButton.displayName =
  SelectPrimitive.ScrollDownButton.displayName

const SelectContent = React.forwardRef(({ className, children, position = "popper", searchable, searchPlaceholder = "Buscar...", ...props }, ref) => {
  const [busqueda, setBusqueda] = React.useState("")
  const inputRef = React.useRef(null)
  const etiquetas = etiquetasOpciones(children)
  const mostrarBuscador = searchable ?? etiquetas.length > 5
  const coincidencias = etiquetas.filter((e) => normalizar(e).includes(normalizar(busqueda))).length

  return (
    <SelectPrimitive.Portal>
      <SelectPrimitive.Content
        ref={ref}
        className={cn(
          "relative z-50 max-h-96 min-w-[8rem] overflow-hidden rounded-md border bg-popover text-popover-foreground shadow-md data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 data-[side=bottom]:slide-in-from-top-2 data-[side=left]:slide-in-from-right-2 data-[side=right]:slide-in-from-left-2 data-[side=top]:slide-in-from-bottom-2",
          position === "popper" &&
            "data-[side=bottom]:translate-y-1 data-[side=left]:-translate-x-1 data-[side=right]:translate-x-1 data-[side=top]:-translate-y-1",
          className
        )}
        position={position}
        onOpenAutoFocus={(e) => {
          if (!mostrarBuscador) return
          e.preventDefault()
          setTimeout(() => inputRef.current?.focus(), 0)
        }}
        {...props}>
        {mostrarBuscador && (
          <div className="sticky top-0 z-10 flex items-center gap-2 border-b bg-popover px-2.5 py-2">
            <Search className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
            <input
              ref={inputRef}
              value={busqueda}
              onChange={(e) => setBusqueda(e.target.value)}
              onKeyDown={(e) => {
                if (["ArrowDown", "ArrowUp", "Enter", "Escape", "Tab"].includes(e.key)) return
                e.stopPropagation()
              }}
              placeholder={searchPlaceholder}
              className="w-full bg-transparent text-sm outline-none placeholder:text-muted-foreground"
            />
          </div>
        )}
        <SelectScrollUpButton />
        <SelectPrimitive.Viewport
          className={cn("p-1", position === "popper" &&
            "h-[var(--radix-select-trigger-height)] w-full min-w-[var(--radix-select-trigger-width)]")}>
          <BusquedaCtx.Provider value={busqueda}>
            {children}
            {mostrarBuscador && etiquetas.length > 0 && coincidencias === 0 && (
              <div className="px-2 py-3 text-center text-sm text-muted-foreground">Sin resultados</div>
            )}
          </BusquedaCtx.Provider>
        </SelectPrimitive.Viewport>
        <SelectScrollDownButton />
      </SelectPrimitive.Content>
    </SelectPrimitive.Portal>
  )
})
SelectContent.displayName = SelectPrimitive.Content.displayName

const SelectLabel = React.forwardRef(({ className, ...props }, ref) => (
  <SelectPrimitive.Label
    ref={ref}
    className={cn("px-2 py-1.5 text-sm font-semibold", className)}
    {...props} />
))
SelectLabel.displayName = SelectPrimitive.Label.displayName

const SelectItem = React.forwardRef(({ className, children, ...props }, ref) => {
  const busqueda = React.useContext(BusquedaCtx)
  const seleccionado = React.useContext(SeleccionCtx)
  const texto = textoNodo(children)
  // Se oculta solo si tiene texto propio que no coincide; la opción ya elegida nunca se oculta.
  if (busqueda && texto && props.value !== seleccionado && !normalizar(texto).includes(normalizar(busqueda))) {
    return null
  }

  return (
  <SelectPrimitive.Item
    ref={ref}
    className={cn(
      "relative flex w-full cursor-default select-none items-center rounded-sm py-1.5 pl-2 pr-8 text-sm outline-none focus:bg-accent focus:text-accent-foreground data-[disabled]:pointer-events-none data-[disabled]:opacity-50",
      className
    )}
    {...props}>
    <span className="absolute right-2 flex h-3.5 w-3.5 items-center justify-center">
      <SelectPrimitive.ItemIndicator>
        <Check className="h-4 w-4" />
      </SelectPrimitive.ItemIndicator>
    </span>
    <SelectPrimitive.ItemText>{children}</SelectPrimitive.ItemText>
  </SelectPrimitive.Item>
  )
})
SelectItem.displayName = SelectPrimitive.Item.displayName

const SelectSeparator = React.forwardRef(({ className, ...props }, ref) => (
  <SelectPrimitive.Separator
    ref={ref}
    className={cn("-mx-1 my-1 h-px bg-muted", className)}
    {...props} />
))
SelectSeparator.displayName = SelectPrimitive.Separator.displayName

export {
  Select,
  SelectGroup,
  SelectValue,
  SelectTrigger,
  SelectContent,
  SelectLabel,
  SelectItem,
  SelectSeparator,
  SelectScrollUpButton,
  SelectScrollDownButton,
}