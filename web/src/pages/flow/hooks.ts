import { useSetModalState } from '@/hooks/commonHooks';
import {
  useFetchFlow,
  useFetchFlowTemplates,
  useSetFlow,
} from '@/hooks/flow-hooks';
import { useFetchLlmList } from '@/hooks/llmHooks';
import { IGraph } from '@/interfaces/database/flow';
import { useIsFetching } from '@tanstack/react-query';
import React, {
  KeyboardEventHandler,
  useCallback,
  useEffect,
  useState,
} from 'react';
import { Node, Position, ReactFlowInstance } from 'reactflow';
import { v4 as uuidv4 } from 'uuid';
// import { shallow } from 'zustand/shallow';
import { useParams } from 'umi';
import useStore, { RFState } from './store';
import { buildDslComponentsByGraph } from './utils';

const selector = (state: RFState) => ({
  nodes: state.nodes,
  edges: state.edges,
  onNodesChange: state.onNodesChange,
  onEdgesChange: state.onEdgesChange,
  onConnect: state.onConnect,
  setNodes: state.setNodes,
  onSelectionChange: state.onSelectionChange,
});

export const useSelectCanvasData = () => {
  // return useStore(useShallow(selector)); // throw error
  // return useStore(selector, shallow);
  return useStore(selector);
};

export const useHandleDrag = () => {
  const handleDragStart = useCallback(
    (operatorId: string) => (ev: React.DragEvent<HTMLDivElement>) => {
      ev.dataTransfer.setData('application/reactflow', operatorId);
      ev.dataTransfer.effectAllowed = 'move';
    },
    [],
  );

  return { handleDragStart };
};

export const useHandleDrop = () => {
  const addNode = useStore((state) => state.addNode);
  const [reactFlowInstance, setReactFlowInstance] =
    useState<ReactFlowInstance<any, any>>();

  const onDragOver = useCallback((event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    event.dataTransfer.dropEffect = 'move';
  }, []);

  const onDrop = useCallback(
    (event: React.DragEvent<HTMLDivElement>) => {
      event.preventDefault();

      const type = event.dataTransfer.getData('application/reactflow');

      // check if the dropped element is valid
      if (typeof type === 'undefined' || !type) {
        return;
      }

      // reactFlowInstance.project was renamed to reactFlowInstance.screenToFlowPosition
      // and you don't need to subtract the reactFlowBounds.left/top anymore
      // details: https://reactflow.dev/whats-new/2023-11-10
      const position = reactFlowInstance?.screenToFlowPosition({
        x: event.clientX,
        y: event.clientY,
      });
      const newNode = {
        id: uuidv4(),
        type: 'textUpdater',
        position: position || {
          x: 0,
          y: 0,
        },
        data: { label: `${type}` },
        sourcePosition: Position.Right,
        targetPosition: Position.Left,
      };

      addNode(newNode);
    },
    [reactFlowInstance, addNode],
  );

  return { onDrop, onDragOver, setReactFlowInstance };
};

export const useShowDrawer = () => {
  const [clickedNode, setClickedNode] = useState<Node>();
  const {
    visible: drawerVisible,
    hideModal: hideDrawer,
    showModal: showDrawer,
  } = useSetModalState();

  const handleShow = useCallback(
    (node: Node) => {
      setClickedNode(node);
      showDrawer();
    },
    [showDrawer],
  );

  return {
    drawerVisible,
    hideDrawer,
    showDrawer: handleShow,
    clickedNode,
  };
};

export const useHandleKeyUp = () => {
  const deleteEdge = useStore((state) => state.deleteEdge);
  const handleKeyUp: KeyboardEventHandler = useCallback(
    (e) => {
      if (e.code === 'Delete') {
        deleteEdge();
      }
    },
    [deleteEdge],
  );

  return { handleKeyUp };
};

export const useSaveGraph = () => {
  const { data } = useFetchFlow();
  const { setFlow } = useSetFlow();
  const { id } = useParams();
  const { nodes, edges } = useStore((state) => state);
  const saveGraph = useCallback(() => {
    const dslComponents = buildDslComponentsByGraph(nodes, edges);
    console.info('components:', dslComponents);
    setFlow({
      id,
      title: data.title,
      dsl: { ...data.dsl, graph: { nodes, edges }, components: dslComponents },
    });
  }, [nodes, edges, setFlow, id, data]);

  return { saveGraph };
};

export const useHandleFormValuesChange = (id?: string) => {
  const updateNodeForm = useStore((state) => state.updateNodeForm);
  const handleValuesChange = useCallback(
    (changedValues: any, values: any) => {
      console.info(changedValues, values);
      if (id) {
        updateNodeForm(id, values);
      }
    },
    [updateNodeForm, id],
  );

  return { handleValuesChange };
};

const useSetGraphInfo = () => {
  const { setEdges, setNodes } = useStore((state) => state);
  const setGraphInfo = useCallback(
    ({ nodes = [], edges = [] }: IGraph) => {
      if (nodes.length && edges.length) {
        setNodes(nodes);
        setEdges(edges);
      }
    },
    [setEdges, setNodes],
  );
  return setGraphInfo;
};

export const useFetchDataOnMount = () => {
  const { loading, data } = useFetchFlow();
  const setGraphInfo = useSetGraphInfo();

  useEffect(() => {
    setGraphInfo(data?.dsl?.graph ?? {});
  }, [setGraphInfo, data?.dsl?.graph]);

  useFetchFlowTemplates();
  useFetchLlmList();

  return { loading, flowDetail: data };
};

export const useFlowIsFetching = () => {
  return useIsFetching({ queryKey: ['flowDetail'] }) > 0;
};
