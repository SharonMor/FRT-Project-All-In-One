from typing import Dict, Any

import networkx as nx
from singleton_decorator import singleton

from src.annotations.init_database import init_database
from src.annotations.init_logger import init_logger
from src.config.constants import REQUEST_TYPE_COLLECTION_COMA_ID_VALUE


@singleton
@init_logger()
@init_database()
class TeamsGraph:
    def __init__(self):
        """
        Initialize the TeamsGraph singleton instance.
        Creates a directed graph to represent teams and their relationships.
        """
        self.graph = nx.DiGraph()

    async def init(self):
        graph_data_json = await self.database.get(REQUEST_TYPE_COLLECTION_COMA_ID_VALUE, "teams_manager,teams_graph")
        if graph_data_json and graph_data_json['success'] is True:
            self.graph = self.from_dict(graph_data_json['data'])
        self.logger.info("TeamsGraph initialized")

    async def add_team(self, team_id: str) -> bool:
        """
        Add a team to the graph by team ID.

        Args:
            team_id (str): The team ID to add.

        Returns:
            bool: True if the team was added, False if the team already exists.
        """
        if team_id in self.graph:
            self.logger.warning(f"Team already exists: {team_id}")
            return False
        self.graph.add_node(team_id)
        await self.database.update(REQUEST_TYPE_COLLECTION_COMA_ID_VALUE, "teams_manager,teams_graph", self.to_dict())
        self.logger.info(f"Team added: {team_id}")
        return True

    async def add_subteam(self, parent_team_id: str, child_team_id: str) -> bool:
        """
        Add a subteam relationship to the graph.

        Args:
            parent_team_id (str): The ID of the parent team.
            child_team_id (str): The ID of the child team.

        Returns:
            bool: True if the subteam relationship was added.
        """
        if parent_team_id not in self.graph or child_team_id not in self.graph:
            self.logger.error(f"One or both teams do not exist: {parent_team_id}, {child_team_id}")
            raise ValueError("One or both teams do not exist")
        self.graph.add_edge(parent_team_id, child_team_id)
        await self.database.update(REQUEST_TYPE_COLLECTION_COMA_ID_VALUE, "teams_manager,teams_graph", self.to_dict())
        self.logger.info(f"Subteam relationship added: {parent_team_id} -> {child_team_id}")
        return True

    async def remove_subteam(self, parent_team_id: str, child_team_id: str):
        """
        Remove a subteam relationship from the graph.

        Args:
            parent_team_id (str): The ID of the parent team.
            child_team_id (str): The ID of the child team.

        Returns:
            bool: True if the relationship was removed, False if the relationship did not exist.
        """
        if parent_team_id not in self.graph or child_team_id not in self.graph:
            self.logger.error(f"One or both teams do not exist: {parent_team_id}, {child_team_id}")
            raise ValueError("One or both teams do not exist")
        if not self.graph.has_edge(parent_team_id, child_team_id):
            self.logger.error(
                f"The specified parent-child relationship does not exist: {parent_team_id} -> {child_team_id}")
            raise ValueError("The specified parent-child relationship does not exist")
        self.graph.remove_edge(parent_team_id, child_team_id)
        await self.database.update(REQUEST_TYPE_COLLECTION_COMA_ID_VALUE, "teams_manager,teams_graph", self.to_dict())
        self.logger.info(f"Subteam relationship removed: {parent_team_id} -> {child_team_id}")
        return True

    def get_team_hierarchy(self, team_id: str) -> Dict[str, Any]:
        """
        Get the hierarchy of a team.

        Args:
            team_id (str): The ID of the team.

        Returns:
            Dict[str, Any]: The hierarchy of the team, including parents and children.
        """
        if team_id not in self.graph:
            self.logger.error(f"Team does not exist: {team_id}")
            raise ValueError("Team does not exist")
        return self._build_hierarchy(team_id)

    def get_all_hierarchies(self) -> Dict[str, Dict[str, Any]]:
        """
        Get the hierarchies of all root teams.

        Returns:
            Dict[str, Dict[str, Any]]: The hierarchies of all root teams.
        """
        all_hierarchies = {}
        for team_id in self.graph.nodes:
            if not list(self.graph.predecessors(team_id)):  # Root nodes have no predecessors
                all_hierarchies[team_id] = self.get_team_hierarchy(team_id)
        self.logger.info("All hierarchies retrieved")
        return all_hierarchies

    def _build_hierarchy(self, team_id: str) -> Dict[str, Any]:
        """
        Recursively build the hierarchy for a team.

        Args:
            team_id (str): The ID of the team.

        Returns:
            Dict[str, Any]: A dictionary containing the team's hierarchy.
        """
        return {
            'team_id': team_id,
            'parents': list(self.graph.predecessors(team_id)),
            'children': [self._build_hierarchy(child) for child in self.graph.successors(team_id)]
        }

    def to_dict(self) -> Dict[str, Any]:
        """
        Serialize the TeamsGraph to a dictionary suitable for JSON serialization.

        Returns:
            dict: Dictionary representation of the graph.
        """
        return {
            "nodes": list(self.graph.nodes()),
            "edges": [{"source": u, "target": v} for u, v in self.graph.edges()]
        }

    @classmethod
    def from_dict(cls, data: Dict[str, Any]):
        """
        Build a TeamsGraph from a dictionary representation.

        Args:
            data (dict): Dictionary representing the graph.

        Returns:
            TeamsGraph: Instance of TeamsGraph populated from dictionary data.
        """
        graph_instance = cls()
        graph_instance.graph = nx.DiGraph()
        graph_instance.graph.add_nodes_from(data.get("nodes", []))
        graph_instance.graph.add_edges_from([(edge['source'], edge['target']) for edge in data.get("edges", [])])
        return graph_instance.graph

    async def clear_graph(self):
        """
        Asynchronously clear the graph, removing all nodes and edges.
        """
        self.graph.clear()
        self.logger.info("Graph cleared")
