import { redirect } from "next/navigation";
import { session } from "@/lib/data/repository";
import { ActionForm, Submit } from "@/components/action-form";
import { Input, Textarea } from "@/components/ui/input";
import { saveProfile } from "@/app/actions";
export default async function Settings() {
  const { profile } = await session();
  if (!profile) redirect("/login?next=/settings");
  return (
    <div className="form-page">
      <header className="page-header">
        <p className="eyebrow">MY PROFILE</p>
        <h1>나를 소개하는 음악 서재</h1>
      </header>
      <ActionForm action={saveProfile} className="panel">
        <label className="field">
          <span>닉네임</span>
          <Input
            name="nickname"
            defaultValue={profile.nickname}
            required
            maxLength={40}
          />
        </label>
        <label className="field">
          <span>프로필 주소 이름</span>
          <Input
            name="username"
            defaultValue={profile.username}
            required
            pattern="[a-z0-9_]{3,40}"
          />
          <small>영문 소문자, 숫자, 밑줄 3–40자</small>
        </label>
        <label className="field">
          <span>자기소개</span>
          <Textarea name="bio" defaultValue={profile.bio} maxLength={500} />
        </label>
        <label className="field">
          <span>관심 장르</span>
          <Input
            name="genres"
            defaultValue={profile.genres.join(", ")}
            maxLength={200}
          />
          <small>쉼표로 구분해 주세요.</small>
        </label>
        <label className="field">
          <span>공개할 좋아하는 아티스트</span>
          <Input
            name="favorite_artists"
            defaultValue={profile.favorite_artists?.join(", ")}
            maxLength={500}
          />
          <small>쉼표로 구분해 주세요. 공개 프로필에 표시됩니다.</small>
        </label>
        <Submit>프로필 저장</Submit>
      </ActionForm>
    </div>
  );
}
