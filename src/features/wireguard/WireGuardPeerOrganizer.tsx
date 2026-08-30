import {
  DndContext,
  DragOverlay,
  KeyboardSensor,
  PointerSensor,
  closestCenter,
  useSensor,
  useSensors,
  type DragEndEvent,
  type DragOverEvent,
  type DragStartEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  defaultAnimateLayoutChanges,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
  type AnimateLayoutChanges,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { DownOutlined, EllipsisOutlined, HolderOutlined } from "@ant-design/icons";
import { Button, Dropdown } from "antd";
import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import type { WireGuardPeer, WireGuardPeerCategory } from "./types";
import {
  moveCategoryForDrag,
  movePeerForDrag,
  type WireGuardDragTarget,
} from "./wireGuardPeerOrder";

const CATEGORY_PREFIX = "category:";
const PEER_PREFIX = "peer:";
const SORT_TRANSITION = {
  duration: 240,
  easing: "cubic-bezier(0.2, 0.8, 0.2, 1)",
};

type ActiveDrag =
  | { type: "category"; categoryId: string }
  | { type: "peer"; peerId: string }
  | null;

const animateLayoutChanges: AnimateLayoutChanges = (args) => defaultAnimateLayoutChanges({
  ...args,
  wasDragging: true,
});

const categoryDndId = (categoryId: string) => `${CATEGORY_PREFIX}${categoryId}`;
const peerDndId = (peerId: string) => `${PEER_PREFIX}${peerId}`;

function parseDndId(value: string | number): WireGuardDragTarget | null {
  const id = String(value);
  if (id.startsWith(CATEGORY_PREFIX)) {
    return { type: "category", categoryId: id.slice(CATEGORY_PREFIX.length) };
  }
  if (id.startsWith(PEER_PREFIX)) {
    return { type: "peer", peerId: id.slice(PEER_PREFIX.length) };
  }
  return null;
}

function SortablePeer({
  peer,
  disabled,
  renderContent,
}: {
  peer: WireGuardPeer;
  disabled: boolean;
  renderContent: (peer: WireGuardPeer) => ReactNode;
}) {
  const {
    attributes,
    isDragging,
    listeners,
    setNodeRef,
    transform,
    transition,
  } = useSortable({
    id: peerDndId(peer.id),
    data: { type: "peer", peerId: peer.id },
    disabled,
    animateLayoutChanges,
    transition: SORT_TRANSITION,
  });
  return (
    <article
      ref={setNodeRef}
      className={`wireguard-peer wireguard-peer--sortable${isDragging ? " wireguard-peer--dragging" : ""}`}
      role="listitem"
      style={{
        transform: CSS.Transform.toString(transform),
        transition: [transition, "background-color 120ms ease", "opacity 120ms ease", "box-shadow 180ms ease"]
          .filter(Boolean)
          .join(", "),
      }}
    >
      <button
        type="button"
        className="wireguard-peer__drag"
        disabled={disabled}
        aria-label={`Изменить порядок ${peer.name}`}
        title="Перетащить или нажать пробел и использовать стрелки"
        {...attributes}
        {...listeners}
      >
        <HolderOutlined aria-hidden="true" />
      </button>
      {renderContent(peer)}
    </article>
  );
}

function SortableCategory({
  category,
  peers,
  open,
  disabled,
  peerOrderPending,
  onToggle,
  onRename,
  onDelete,
  renderPeer,
}: {
  category: WireGuardPeerCategory;
  peers: WireGuardPeer[];
  open: boolean;
  disabled: boolean;
  peerOrderPending: boolean;
  onToggle: () => void;
  onRename: () => void;
  onDelete: () => void;
  renderPeer: (peer: WireGuardPeer) => ReactNode;
}) {
  const {
    attributes,
    isDragging,
    listeners,
    setNodeRef,
    transform,
    transition,
  } = useSortable({
    id: categoryDndId(category.id),
    data: { type: "category", categoryId: category.id },
    disabled,
    animateLayoutChanges,
    transition: SORT_TRANSITION,
  });

  return (
    <section
      ref={setNodeRef}
      className={`wireguard-peer-group wireguard-peer-group--sortable${isDragging ? " wireguard-peer-group--dragging" : ""}`}
      style={{
        transform: CSS.Transform.toString(transform),
        transition: [transition, "opacity 120ms ease"].filter(Boolean).join(", "),
      }}
    >
      <header className="wireguard-peer-group__header">
        <button
          type="button"
          className="wireguard-peer-group__drag"
          disabled={disabled}
          aria-label={`Изменить порядок категории ${category.name}`}
          title="Перетащить категорию"
          {...attributes}
          {...listeners}
        >
          <HolderOutlined aria-hidden="true" />
        </button>
        <button
          type="button"
          className="wireguard-peer-group__toggle"
          aria-expanded={open}
          aria-controls={`wireguard-category-${category.id}`}
          onClick={onToggle}
        >
          <DownOutlined aria-hidden="true" />
          <span>{category.name}</span>
          <small>{peers.length}</small>
        </button>
        <Dropdown
          trigger={["click"]}
          overlayClassName="wireguard-peer-menu"
          menu={{
            items: [
              { key: "rename", label: "Переименовать" },
              {
                key: "delete",
                label: peers.length === 0 ? "Удалить категорию" : "Сначала перенесите устройства",
                danger: peers.length === 0,
                disabled: peers.length > 0,
              },
            ],
            onClick: ({ key }) => {
              if (key === "rename") onRename();
              if (key === "delete") onDelete();
            },
          }}
        >
          <Button
            type="text"
            size="small"
            icon={<EllipsisOutlined />}
            aria-label={`Действия категории ${category.name}`}
          />
        </Dropdown>
      </header>
      <div
        id={`wireguard-category-${category.id}`}
        className={`wireguard-peer-group__content${open ? "" : " wireguard-peer-group__content--closed"}`}
        role="list"
        aria-label={category.name}
      >
        <SortableContext
          items={peers.map((peer) => peerDndId(peer.id))}
          strategy={verticalListSortingStrategy}
        >
          {peers.length === 0 ? (
            <p className="wireguard-peer-group__empty">Перетащи сюда нужные устройства</p>
          ) : peers.map((peer) => (
            <SortablePeer
              key={peer.id}
              peer={peer}
              disabled={peerOrderPending}
              renderContent={renderPeer}
            />
          ))}
        </SortableContext>
      </div>
    </section>
  );
}

export default function WireGuardPeerOrganizer({
  categories,
  peers,
  peerOrderPending,
  categoryOrderPending,
  onPeerOrderChange,
  onCategoryOrderChange,
  onAddCategory,
  onRenameCategory,
  onDeleteCategory,
  renderPeer,
  addDevice,
}: {
  categories: WireGuardPeerCategory[];
  peers: WireGuardPeer[];
  peerOrderPending: boolean;
  categoryOrderPending: boolean;
  onPeerOrderChange: (peers: WireGuardPeer[]) => void;
  onCategoryOrderChange: (categories: WireGuardPeerCategory[]) => void;
  onAddCategory: () => void;
  onRenameCategory: (category: WireGuardPeerCategory) => void;
  onDeleteCategory: (category: WireGuardPeerCategory) => void;
  renderPeer: (peer: WireGuardPeer) => ReactNode;
  addDevice: ReactNode;
}) {
  const [localCategories, setLocalCategories] = useState(categories);
  const [localPeers, setLocalPeers] = useState(peers);
  const [activeDrag, setActiveDrag] = useState<ActiveDrag>(null);
  const [openCategories, setOpenCategories] = useState<Set<string>>(
    () => new Set(categories.map((category) => category.id)),
  );
  const initialCategories = useRef(categories);
  const initialPeers = useRef(peers);
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 7 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  useEffect(() => {
    if (!activeDrag) setLocalCategories(categories);
    setOpenCategories((current) => {
      const next = new Set(current);
      categories.forEach((category) => next.add(category.id));
      return next;
    });
  }, [activeDrag, categories]);

  useEffect(() => {
    if (!activeDrag) setLocalPeers(peers);
  }, [activeDrag, peers]);

  const peersByCategory = useMemo(() => new Map(localCategories.map((category) => [
    category.name,
    localPeers.filter((peer) => peer.category === category.name),
  ])), [localCategories, localPeers]);

  const finishDrag = () => setActiveDrag(null);

  const handleDragStart = ({ active }: DragStartEvent) => {
    const parsed = parseDndId(active.id);
    if (!parsed) return;
    initialCategories.current = localCategories;
    initialPeers.current = localPeers;
    setActiveDrag(parsed);
  };

  const handleDragOver = ({ active, over }: DragOverEvent) => {
    if (!over) return;
    const activeItem = parseDndId(active.id);
    const target = parseDndId(over.id);
    if (!activeItem || !target) return;
    if (activeItem.type === "peer") {
      setLocalPeers((current) => movePeerForDrag(current, localCategories, activeItem.peerId, target));
      const targetCategoryId = target.type === "category"
        ? target.categoryId
        : localCategories.find((category) => (
          category.name === localPeers.find((peer) => peer.id === target.peerId)?.category
        ))?.id;
      if (targetCategoryId) {
        setOpenCategories((current) => new Set(current).add(targetCategoryId));
      }
      return;
    }
    const targetCategoryId = target.type === "category"
      ? target.categoryId
      : localCategories.find((category) => (
        category.name === localPeers.find((peer) => peer.id === target.peerId)?.category
      ))?.id;
    if (targetCategoryId) {
      setLocalCategories((current) => moveCategoryForDrag(current, activeItem.categoryId, targetCategoryId));
    }
  };

  const handleDragEnd = ({ active, over }: DragEndEvent) => {
    const activeItem = parseDndId(active.id);
    const target = over ? parseDndId(over.id) : null;
    if (!activeItem || !target) {
      setLocalCategories(initialCategories.current);
      setLocalPeers(initialPeers.current);
      finishDrag();
      return;
    }
    if (activeItem.type === "peer") {
      const next = movePeerForDrag(localPeers, localCategories, activeItem.peerId, target);
      setLocalPeers(next);
      onPeerOrderChange(next);
    } else {
      const targetCategoryId = target.type === "category"
        ? target.categoryId
        : localCategories.find((category) => (
          category.name === localPeers.find((peer) => peer.id === target.peerId)?.category
        ))?.id;
      if (targetCategoryId) {
        const next = moveCategoryForDrag(localCategories, activeItem.categoryId, targetCategoryId);
        setLocalCategories(next);
        onCategoryOrderChange(next);
      }
    }
    finishDrag();
  };

  const handleDragCancel = () => {
    setLocalCategories(initialCategories.current);
    setLocalPeers(initialPeers.current);
    finishDrag();
  };

  const overlayPeer = activeDrag?.type === "peer"
    ? localPeers.find((peer) => peer.id === activeDrag.peerId)
    : null;
  const overlayCategory = activeDrag?.type === "category"
    ? localCategories.find((category) => category.id === activeDrag.categoryId)
    : null;

  return (
    <div className="wireguard-peer-list" aria-label="Устройства">
      <div className="wireguard-peer-list__toolbar">
        <span>
          <strong>Устройства</strong>
          <small>Перетаскивай строки и категории за маркер</small>
        </span>
        <Button type="text" icon={<span aria-hidden="true">＋</span>} onClick={onAddCategory}>
          Категория
        </Button>
      </div>
      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragStart={handleDragStart}
        onDragOver={handleDragOver}
        onDragEnd={handleDragEnd}
        onDragCancel={handleDragCancel}
        accessibility={{
          screenReaderInstructions: {
            draggable: "Чтобы переместить элемент, нажмите пробел, используйте стрелки и снова нажмите пробел.",
          },
        }}
      >
        <SortableContext
          items={localCategories.map((category) => categoryDndId(category.id))}
          strategy={verticalListSortingStrategy}
        >
          {localCategories.map((category) => (
            <SortableCategory
              key={category.id}
              category={category}
              peers={peersByCategory.get(category.name) ?? []}
              open={openCategories.has(category.id)}
              disabled={categoryOrderPending || Boolean(activeDrag?.type === "peer")}
              peerOrderPending={peerOrderPending || Boolean(activeDrag?.type === "category")}
              onToggle={() => setOpenCategories((current) => {
                const next = new Set(current);
                if (next.has(category.id)) next.delete(category.id);
                else next.add(category.id);
                return next;
              })}
              onRename={() => onRenameCategory(category)}
              onDelete={() => onDeleteCategory(category)}
              renderPeer={renderPeer}
            />
          ))}
        </SortableContext>
        <DragOverlay adjustScale={false} dropAnimation={SORT_TRANSITION}>
          {overlayPeer ? (
            <article className="wireguard-peer wireguard-peer--overlay" aria-hidden="true">
              <span className="wireguard-peer__drag"><HolderOutlined /></span>
              {renderPeer(overlayPeer)}
            </article>
          ) : overlayCategory ? (
            <div className="wireguard-peer-group__overlay" aria-hidden="true">
              <HolderOutlined />
              <strong>{overlayCategory.name}</strong>
              <small>{peersByCategory.get(overlayCategory.name)?.length ?? 0}</small>
            </div>
          ) : null}
        </DragOverlay>
      </DndContext>
      {addDevice}
    </div>
  );
}
