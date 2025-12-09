import React from "react";

interface ScoreCardProps {
  data: {
    final_score: number;
    score_breakdown: {
      skill_match_percent: number;
      keyword_coverage_percent: number;
      semantic_similarity: number;
      model_probability_score: number;
    };
    matched_skills: string[];
    missing_skills: string[];
    years_experience_estimate: number;
    recommendations: string[];
  };
}

const ScoreCard: React.FC<ScoreCardProps> = ({ data }) => {

  if (!data || data.final_score === undefined) {
    return <div>No score available.</div>;
  }

  return (
    <div className="score-card">
      <h2>ATS Match Report</h2>

      <h3>Final Score: {data.final_score.toFixed(2)} / 10</h3>

      <div className="score-section">
        <p><strong>Skill Match:</strong> {data.score_breakdown.skill_match_percent}%</p>
        <p><strong>Keyword Coverage:</strong> {data.score_breakdown.keyword_coverage_percent}%</p>
        <p><strong>Semantic Similarity:</strong> {data.score_breakdown.semantic_similarity}/10</p>
        <p><strong>Model Probability:</strong> {data.score_breakdown.model_probability_score}/10</p>
      </div>

      <div className="skills-section">
        <h4>Matched Skills:</h4>
        <p>{data.matched_skills.join(", ") || "None"}</p>

        <h4>Missing Skills:</h4>
        <p>{data.missing_skills.join(", ") || "None"}</p>
      </div>

      <h4>Experience Estimate:</h4>
      <p>{data.years_experience_estimate} years</p>

      <h4>Recommendations:</h4>
      <ul>
        {data.recommendations.map((r, i) => (
          <li key={i}>{r}</li>
        ))}
      </ul>
    </div>
  );
};

export default ScoreCard;
