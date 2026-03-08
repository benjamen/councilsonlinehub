import frappe
from frappe.model.document import Document


class AgentProfile(Document):
	def validate(self):
		if self.bio and len(self.bio) > 500:
			frappe.throw("Bio must be 500 characters or less")

	def recalculate_stats(self):
		"""Recalculate statistics from Agent Review and Request data"""
		# Rating stats
		result = frappe.db.sql("""
			SELECT COUNT(*) as cnt, COALESCE(AVG(rating), 0) as avg_rating
			FROM `tabAgent Review`
			WHERE agent_profile = %s AND is_published = 1
		""", self.name, as_dict=True)[0]

		self.total_reviews = result.cnt
		self.average_rating = round(result.avg_rating, 1)

		# Application count
		self.total_applications = frappe.db.count("Request", filters={
			"agent": self.user,
			"docstatus": ["<", 2]
		})

		self.db_update()
